/**
 * Appeal System - Widerspruch, Berufung & Rehabilitationsprozess
 * Rechtlicher Gegenpol zur Kündigung - Faire Chancen auf Wiederherstellung
 */

import { v4 as uuidv4 } from 'uuid';

export interface Appeal {
  appealId: string;
  userId: string;
  terminationId?: string;
  violationId?: string;
  appealType: 'termination-appeal' | 'violation-appeal' | 'rehabilitation-request';
  submittedAt: string;
  reason: string;
  evidence: {
    documents: string[];
    witness?: string[];
    photoProof?: string[];
  };
  status: 'submitted' | 'under-review' | 'hearing-scheduled' | 'decision-pending' | 'approved' | 'rejected' | 'escalated';
  appealCount: number; // max 3 Berufungen
  nextHearingDate?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  decision?: {
    outcome: 'upheld' | 'overturned' | 'modified';
    reason: string;
    newConditions?: string[];
    rehabilitationPlan?: string;
  };
}

export interface RehabilitationPlan {
  planId: string;
  userId: string;
  appealId: string;
  startDate: string;
  endDate: string;
  objectives: string[];
  milestones: {
    date: string;
    description: string;
    completed: boolean;
  }[];
  counselor?: string;
  status: 'active' | 'completed' | 'failed' | 'suspended';
  completionPercent: number;
}

export interface ReviewBoard {
  boardId: string;
  members: {
    name: string;
    role: 'chair' | 'representative' | 'mediator';
    qualifications: string[];
  }[];
  createdAt: string;
}

export class AppealSystem {
  private appeals: Map<string, Appeal> = new Map();
  private rehabilitationPlans: Map<string, RehabilitationPlan> = new Map();
  private reviewBoards: Map<string, ReviewBoard> = new Map();
  private appealHistory: Map<string, Appeal[]> = new Map();

  /**
   * Berufung einreichen gegen Kündigung oder Verstoß
   */
  submitAppeal(
    userId: string,
    appealType: 'termination-appeal' | 'violation-appeal' | 'rehabilitation-request',
    reason: string,
    evidence: Appeal['evidence'],
    previousAppealCount: number = 0,
    terminationId?: string,
    violationId?: string
  ): Appeal | null {
    // Max 3 Berufungen pro Fall
    if (previousAppealCount >= 3) {
      console.error('❌ Maximum appeal count reached (3)');
      return null;
    }

    const appeal: Appeal = {
      appealId: uuidv4(),
      userId,
      terminationId,
      violationId,
      appealType,
      submittedAt: new Date().toISOString(),
      reason,
      evidence,
      status: 'submitted',
      appealCount: previousAppealCount + 1,
    };

    this.appeals.set(appeal.appealId, appeal);

    // Zu Benutzer-History hinzufügen
    const userAppeals = this.appealHistory.get(userId) || [];
    userAppeals.push(appeal);
    this.appealHistory.set(userId, userAppeals);

    console.log(`✓ Appeal ${appeal.appealId} submitted by ${userId}`);
    return appeal;
  }

  /**
   * Berufung zu Prüfung einreihen
   */
  scheduleHearing(appealId: string, hearingDate: string): Appeal | null {
    const appeal = this.appeals.get(appealId);
    if (!appeal) return null;

    appeal.status = 'hearing-scheduled';
    appeal.nextHearingDate = hearingDate;

    console.log(`📅 Hearing scheduled for appeal ${appealId} on ${hearingDate}`);
    return appeal;
  }

  /**
   * Review-Board zusammenstellen
   */
  createReviewBoard(
    members: ReviewBoard['members']
  ): ReviewBoard {
    const board: ReviewBoard = {
      boardId: uuidv4(),
      members,
      createdAt: new Date().toISOString(),
    };

    this.reviewBoards.set(board.boardId, board);
    console.log(`✓ Review board ${board.boardId} created with ${members.length} members`);

    return board;
  }

  /**
   * Berufungsentscheidung treffen
   */
  decideAppeal(
    appealId: string,
    outcome: 'upheld' | 'overturned' | 'modified',
    reason: string,
    reviewedBy: string,
    newConditions?: string[],
    rehabilitationPlanText?: string
  ): Appeal | null {
    const appeal = this.appeals.get(appealId);
    if (!appeal) return null;

    appeal.status = 'decision-pending';
    appeal.reviewedBy = reviewedBy;
    appeal.reviewedAt = new Date().toISOString();
    appeal.decision = {
      outcome,
      reason,
      newConditions,
      rehabilitationPlan: rehabilitationPlanText,
    };

    // Bei erfolgreicher Berufung: Rehabilitationsplan erstellen
    if (outcome === 'overturned' || outcome === 'modified') {
      if (rehabilitationPlanText) {
        this.createRehabilitationPlan(appeal.userId, appealId, rehabilitationPlanText);
      }
    }

    console.log(`✓ Appeal ${appealId} decided: ${outcome}`);
    return appeal;
  }

  /**
   * Rehabilitationsplan erstellen
   */
  createRehabilitationPlan(
    userId: string,
    appealId: string,
    planDescription: string,
    durationDays: number = 90
  ): RehabilitationPlan {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const plan: RehabilitationPlan = {
      planId: uuidv4(),
      userId,
      appealId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      objectives: [
        'Einhaltung aller Normen und Regeln',
        'Regelmäßige Check-ins mit Counselor',
        'Teilnahme an Gemeinschaftsaktivitäten',
      ],
      milestones: [
        {
          date: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Erstes Monat: Bewährung und Anpassung',
          completed: false,
        },
        {
          date: new Date(startDate.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Zweites Monat: Aktive Teilnahme demonstrieren',
          completed: false,
        },
        {
          date: endDate.toISOString(),
          description: 'Abschluss und Evaluierung',
          completed: false,
        },
      ],
      status: 'active',
      completionPercent: 0,
    };

    this.rehabilitationPlans.set(plan.planId, plan);
    console.log(`✓ Rehabilitation plan ${plan.planId} created for ${userId}`);

    return plan;
  }

  /**
   * Meilenstein als abgeschlossen markieren
   */
  completeMilestone(planId: string, milestoneIndex: number): RehabilitationPlan | null {
    const plan = this.rehabilitationPlans.get(planId);
    if (!plan || milestoneIndex >= plan.milestones.length) return null;

    plan.milestones[milestoneIndex].completed = true;
    const completedCount = plan.milestones.filter((m) => m.completed).length;
    plan.completionPercent = (completedCount / plan.milestones.length) * 100;

    console.log(`✓ Milestone ${milestoneIndex} completed for plan ${planId}`);

    // Plan abschließen wenn alle Meilensteine erfüllt
    if (plan.completionPercent === 100) {
      plan.status = 'completed';
      console.log(`✅ Rehabilitation plan ${planId} completed!`);
    }

    return plan;
  }

  /**
   * Rehabilitationsplan als fehlgeschlagen markieren
   */
  failRehabilitationPlan(planId: string, reason: string): RehabilitationPlan | null {
    const plan = this.rehabilitationPlans.get(planId);
    if (!plan) return null;

    plan.status = 'failed';
    console.log(`❌ Rehabilitation plan ${planId} marked as failed: ${reason}`);

    return plan;
  }

  /**
   * Berufung eskalieren (an höhere Instanz)
   */
  escalateAppeal(appealId: string, reason: string): Appeal | null {
    const appeal = this.appeals.get(appealId);
    if (!appeal) return null;

    appeal.status = 'escalated';
    console.log(`⬆️ Appeal ${appealId} escalated: ${reason}`);

    return appeal;
  }

  /**
   * Berufungshistorie eines Nutzers abrufen
   */
  getUserAppealHistory(userId: string): Appeal[] {
    return this.appealHistory.get(userId) || [];
  }

  /**
   * Aktive Rehabilitationspläne für Nutzer
   */
  getActiveRehabilitationPlans(userId: string): RehabilitationPlan[] {
    return Array.from(this.rehabilitationPlans.values())
      .filter((p) => p.userId === userId && p.status === 'active');
  }

  /**
   * Berufungs-Statistiken
   */
  getAppealStatistics(): {
    totalAppeals: number;
    pendingAppeals: number;
    approvedAppeals: number;
    rejectedAppeals: number;
    appealSuccessRate: number;
  } {
    const appeals = Array.from(this.appeals.values());
    const approved = appeals.filter((a) => a.decision?.outcome === 'overturned');
    const rejected = appeals.filter((a) => a.decision?.outcome === 'upheld');
    const pending = appeals.filter(
      (a) => a.status === 'submitted' || a.status === 'under-review' || a.status === 'hearing-scheduled'
    );

    const successRate =
      approved.length + rejected.length > 0
        ? (approved.length / (approved.length + rejected.length)) * 100
        : 0;

    return {
      totalAppeals: appeals.length,
      pendingAppeals: pending.length,
      approvedAppeals: approved.length,
      rejectedAppeals: rejected.length,
      appealSuccessRate: successRate,
    };
  }
}

export const appealSystem = new AppealSystem();
