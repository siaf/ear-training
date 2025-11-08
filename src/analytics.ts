import { Answer, SessionStats, WeaknessReport } from './types';

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

    return {
      totalQuestions,
      correctAnswers,
      accuracy,
      weaknesses,
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

    // Identify strong areas
    const strongItems = stats.weaknesses.filter(w => w.attempts >= 2 && w.accuracy >= 90);
    if (strongItems.length > 0) {
      const itemNames = strongItems.slice(0, 2).map(w => w.item).join(', ');
      insights.push(`✨ You're strong at: ${itemNames}`);
    }

    return insights;
  }
}
