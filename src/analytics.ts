import { Answer, SessionStats, WeaknessReport, ScaleDegreeWeakness, ConfusionPair } from './types';

export class AnalyticsEngine {
  private answers: Answer[] = [];

  addAnswer(answer: Answer) {
    this.answers.push(answer);
  }

  getSessionStats(): SessionStats {
    const totalQuestions = this.answers.length;
    const correctAnswers = this.answers.filter(a => a.isCorrect).length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    const weaknesses = this.calculateWeaknesses();
    const scaleDegreeWeaknesses = this.calculateScaleDegreeWeaknesses();
    const confusionMatrix = this.calculateConfusionMatrix();

    return {
      totalQuestions,
      correctAnswers,
      accuracy,
      weaknesses,
      scaleDegreeWeaknesses,
      confusionMatrix,
    };
  }

  private calculateWeaknesses(): WeaknessReport[] {
    // Group answers by the full description (root note + type)
    const itemStats = new Map<string, { attempts: number; correct: number }>();

    this.answers.forEach(answer => {
      const item = answer.fullDescription;
      const stats = itemStats.get(item) || { attempts: 0, correct: 0 };
      
      stats.attempts++;
      if (answer.isCorrect) {
        stats.correct++;
      }
      
      itemStats.set(item, stats);
    });

    // Convert to weakness reports and sort by accuracy
    const reports: WeaknessReport[] = [];
    
    itemStats.forEach((stats, item) => {
      const accuracy = (stats.correct / stats.attempts) * 100;
      reports.push({
        item,
        attempts: stats.attempts,
        correct: stats.correct,
        accuracy,
      });
    });

    // Sort by accuracy (lowest first) to highlight weaknesses
    reports.sort((a, b) => a.accuracy - b.accuracy);

    return reports;
  }

  private calculateScaleDegreeWeaknesses(): ScaleDegreeWeakness[] {
    const degreeStats = new Map<string, { attempts: number; correct: number; degree: number; questionType: string }>();

    this.answers.forEach(answer => {
      if (answer.scaleDegree !== undefined) {
        const degreeNames = ['I (Root)', 'ii', 'iii', 'IV', 'V (Dominant)', 'vi', 'vii°'];
        const key = `${degreeNames[answer.scaleDegree]}_${answer.questionType}`;
        const stats = degreeStats.get(key) || { 
          attempts: 0, 
          correct: 0, 
          degree: answer.scaleDegree,
          questionType: answer.questionType 
        };
        
        stats.attempts++;
        if (answer.isCorrect) {
          stats.correct++;
        }
        
        degreeStats.set(key, stats);
      }
    });

    const reports: ScaleDegreeWeakness[] = [];
    degreeStats.forEach((stats) => {
      const accuracy = (stats.correct / stats.attempts) * 100;
      const degreeNames = ['I (Root)', 'ii', 'iii', 'IV', 'V (Dominant)', 'vi', 'vii°'];
      const context = `${stats.questionType}s from ${degreeNames[stats.degree]}`;
      
      reports.push({
        degree: stats.degree,
        attempts: stats.attempts,
        correct: stats.correct,
        accuracy,
        context,
      });
    });

    reports.sort((a, b) => a.accuracy - b.accuracy);
    return reports;
  }

  private calculateConfusionMatrix(): ConfusionPair[] {
    const confusions = new Map<string, number>();

    this.answers.forEach(answer => {
      if (!answer.isCorrect) {
        const key = `${answer.userAnswer}|${answer.correctAnswer}`;
        confusions.set(key, (confusions.get(key) || 0) + 1);
      }
    });

    const pairs: ConfusionPair[] = [];
    confusions.forEach((count, key) => {
      const [mistook, actuallyWas] = key.split('|');
      pairs.push({ mistook, actuallyWas, count });
    });

    pairs.sort((a, b) => b.count - a.count);
    return pairs;
  }

  getAverageResponseTime(): number {
    if (this.answers.length === 0) return 0;
    
    const totalTime = this.answers.reduce((sum, answer) => sum + answer.responseTime, 0);
    return totalTime / this.answers.length;
  }

  reset() {
    this.answers = [];
  }

  // Get specific insights for the user
  getInsights(): string[] {
    const insights: string[] = [];
    const stats = this.getSessionStats();

    if (stats.totalQuestions === 0) {
      return ['Complete some questions to see insights'];
    }

    // Overall performance
    if (stats.accuracy >= 90) {
      insights.push('🎉 Excellent performance! You\'re ready for the next level.');
    } else if (stats.accuracy >= 75) {
      insights.push('👍 Good work! A bit more practice and you\'ll master this level.');
    } else if (stats.accuracy >= 60) {
      insights.push('📚 Keep practicing. Focus on the items you\'re struggling with.');
    } else {
      insights.push('💪 This level is challenging. Take your time and focus on one item at a time.');
    }

    // Identify specific weaknesses
    const weakItems = stats.weaknesses.filter(w => w.attempts >= 2 && w.accuracy < 60);
    if (weakItems.length > 0) {
      const itemNames = weakItems.slice(0, 3).map(w => w.item).join(', ');
      insights.push(`🎯 Focus on: ${itemNames}`);
    }

    // Scale degree weaknesses
    if (stats.scaleDegreeWeaknesses && stats.scaleDegreeWeaknesses.length > 0) {
      const weakDegrees = stats.scaleDegreeWeaknesses.filter(w => w.attempts >= 2 && w.accuracy < 60);
      if (weakDegrees.length > 0) {
        const degreeContext = weakDegrees.slice(0, 2).map(w => w.context).join(', ');
        insights.push(`📍 Struggle with: ${degreeContext}`);
      }
    }

    // Common confusions
    if (stats.confusionMatrix && stats.confusionMatrix.length > 0) {
      const topConfusion = stats.confusionMatrix[0];
      if (topConfusion.count >= 2) {
        insights.push(`⚠️ Often confuse ${topConfusion.actuallyWas} with ${topConfusion.mistook}`);
      }
    }

    // Identify strong areas
    const strongItems = stats.weaknesses.filter(w => w.attempts >= 2 && w.accuracy >= 90);
    if (strongItems.length > 0) {
      const itemNames = strongItems.slice(0, 2).map(w => w.item).join(', ');
      insights.push(`✨ You're strong at: ${itemNames}`);
    }

    return insights;
  }
}
