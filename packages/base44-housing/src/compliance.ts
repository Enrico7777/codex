/**
 * Compliance Module - Rechtliche Verwaltung & Regelwerk
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ResidencyAgreement,
  ComplianceViolation,
  ResidencyTermination,
} from './types';

export class ComplianceManager {
  private agreements: Map<string, ResidencyAgreement> = new Map();
  private violations: Map<string, ComplianceViolation> = new Map();
  private terminations: Map<string, ResidencyTermination> = new Map();

  private violationThresholds = {
    minorToModerate: 3,
    moderateToSevere: 5,
  };

  /**
   * Wohnvereinbarung akzeptieren
   */
  async acceptResidencyAgreement(
    userId: string,
    unitId: string
  ): Promise<ResidencyAgreement> {
    const agreement: ResidencyAgreement = {
      agreementId: uuidv4(),
      userId,
      unitId,
      acceptedAt: new Date().toISOString(),
      acceptedVersion: '1.0',
      normsAndRules: {
        socialBehavior:
          'Residents must maintain respectful and civil conduct. Violations of social norms may result in warnings or residency termination.',
        maintenanceResponsibilities:
          'Residents are responsible for maintaining their units in good condition. Major repairs are handled by management.',
        communityParticipation:
          'Residents are encouraged to participate in community activities and maintain common areas.',
      },
      acknowledgedTerms: true,
      signatureDigital: true,
    };

    this.agreements.set(agreement.agreementId, agreement);

    console.log(
      `✓ Residency agreement accepted by ${userId} for unit ${unitId}`
    );

    return agreement;
  }

  /**
   * Wohnstatus prüfen
   */
  checkResidencyStatus(userId: string): {
    isInGoodStanding: boolean;
    violations: number;
    warnings: number;
    lastViolation?: string;
  } {
    const userViolations = Array.from(this.violations.values()).filter(
      (v) => v.userId === userId && v.status !== 'resolved'
    );

    const minorCount = userViolations.filter((v) => v.severity === 'minor')
      .length;
    const moderateCount = userViolations.filter((v) => v.severity === 'moderate')
      .length;
    const severeCount = userViolations.filter((v) => v.severity === 'severe')
      .length;

    const isInGoodStanding =
      moderateCount < this.violationThresholds.minorToModerate &&
      severeCount === 0;

    const lastViolation =
      userViolations.length > 0
        ? userViolations[userViolations.length - 1].reportedAt
        : undefined;

    return {
      isInGoodStanding,
      violations: userViolations.length,
      warnings: minorCount + moderateCount,
      lastViolation,
    };
  }

  /**
   * Normverstoß melden
   */
  reportNormViolation(
    userId: string,
    unitId: string,
    type:
      | 'noise'
      | 'maintenance'
      | 'social-behavior'
      | 'regulatory'
      | 'other',
    description: string,
    severity: 'minor' | 'moderate' | 'severe' = 'minor',
    reportedBy: string = 'system'
  ): ComplianceViolation {
    const violation: ComplianceViolation = {
      violationId: uuidv4(),
      userId,
      unitId,
      type,
      description,
      severity,
      reportedAt: new Date().toISOString(),
      reportedBy,
      status: 'open',
    };

    this.violations.set(violation.violationId, violation);

    console.log(
      `⚠ Violation reported for ${userId}: ${type} (${severity})`
    );

    // Check if automatic termination is triggered
    const userViolations = Array.from(this.violations.values()).filter(
      (v) => v.userId === userId && v.status !== 'resolved'
    );

    const severeCount = userViolations.filter((v) => v.severity === 'severe')
      .length;

    if (severeCount >= 3) {
      console.log(
        `🛑 Automatic termination triggered for ${userId} (${severeCount} severe violations)`
      );
    }

    return violation;
  }

  /**
   * Wohnverhältnis beenden
   */
  async terminateResidency(
    userId: string,
    unitId: string,
    reason:
      | 'user-request'
      | 'violation'
      | 'payment-failure'
      | 'policy-breach'
      | 'other' = 'user-request'
  ): Promise<ResidencyTermination> {
    const noticePeriodDays =
      reason === 'user-request' ? 30 : reason === 'violation' ? 15 : 7;

    const termination: ResidencyTermination = {
      terminationId: uuidv4(),
      userId,
      unitId,
      initiatedAt: new Date().toISOString(),
      initiatedBy: reason === 'user-request' ? 'user' : 'system',
      reason,
      noticePeriodDays,
      moveOutDate: new Date(
        Date.now() + noticePeriodDays * 24 * 60 * 60 * 1000
      ).toISOString(),
      moveOutCompleted: false,
      securityDepositStatus: 'pending',
      finalStatus: 'pending',
    };

    this.terminations.set(termination.terminationId, termination);

    console.log(
      `⛔ Residency termination initiated for ${userId} (reason: ${reason}, notice: ${noticePeriodDays} days)`
    );

    return termination;
  }

  /**
   * Verletzung auflösen
   */
  resolveViolation(
    violationId: string,
    resolution: 'warning' | 'fine' | 'probation' | 'termination'
  ): ComplianceViolation | null {
    const violation = this.violations.get(violationId);
    if (!violation) {
      return null;
    }

    violation.status = 'resolved';
    violation.resolution = {
      type: resolution,
      date: new Date().toISOString(),
      outcome: `Violation resolved with ${resolution}`,
    };

    console.log(`✓ Violation ${violationId} resolved (${resolution})`);

    return violation;
  }

  /**
   * Alle Verstöße eines Benutzers abrufen
   */
  getUserViolations(userId: string): ComplianceViolation[] {
    const userViolations: ComplianceViolation[] = [];

    for (const violation of this.violations.values()) {
      if (violation.userId === userId) {
        userViolations.push(violation);
      }
    }

    return userViolations;
  }

  /**
   * Beendigungsstatus abrufen
   */
  getTerminationStatus(terminationId: string): ResidencyTermination | null {
    return this.terminations.get(terminationId) || null;
  }

  /**
   * Auszugsprüfung durchführen
   */
  completeExitInspection(
    terminationId: string,
    conditionRating: number,
    damageReported: boolean,
    damageDescription?: string
  ): ResidencyTermination | null {
    const termination = this.terminations.get(terminationId);
    if (!termination) {
      return null;
    }

    termination.exitInspection = {
      date: new Date().toISOString(),
      conditionRating,
      damageReported,
      damageDescription,
    };

    termination.moveOutCompleted = true;

    console.log(
      `✓ Exit inspection completed for ${termination.userId} (condition: ${conditionRating}/10)`
    );

    return termination;
  }

  /**
   * Kaution zurückgeben oder abzuziehen
   */
  processSecurityDeposit(
    terminationId: string,
    action: 'return' | 'deduct',
    deductionReason?: string
  ): ResidencyTermination | null {
    const termination = this.terminations.get(terminationId);
    if (!termination) {
      return null;
    }

    if (action === 'return') {
      termination.securityDepositStatus = 'returned';
      console.log(`✓ Security deposit returned for ${termination.userId}`);
    } else {
      termination.securityDepositStatus = 'deducted';
      console.log(
        `✓ Security deposit deducted for ${termination.userId} (reason: ${deductionReason})`
      );
    }

    return termination;
  }

  /**
   * Konfiguration abrufen
   */
  getConfig(): {
    violationThresholds: typeof this.violationThresholds;
  } {
    return {
      violationThresholds: this.violationThresholds,
    };
  }
}
