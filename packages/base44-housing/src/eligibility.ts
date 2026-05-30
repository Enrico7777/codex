/**
 * Eligibility Module - Berechtigung & Familienstruktur
 */

import type {
  PersonalData,
  Dependent,
  CriminalRecord,
} from './types';

export interface EligibilityResult {
  eligible: boolean;
  baseSpaceM2: number;
  additionalSpaceM2: number;
  totalSpaceAllowed: number;
  maxOccupants: number;
  restrictions: string[];
  warnings: string[];
  notes: string[];
}

export class EligibilityManager {
  private baseAllocationPerPerson = 50; // m²
  private maxFamilyMembers = 8;
  private spacePerChild = 20; // additional m² per child
  private spaceForSpouse = 25; // m² for spouse

  /**
   * Gesamte Berechtigung prüfen
   */
  async checkEligibility(applicant: PersonalData, 
                         dependents: Dependent[] = [],
                         criminalRecord: CriminalRecord): Promise<EligibilityResult> {
    const result: EligibilityResult = {
      eligible: true,
      baseSpaceM2: this.baseAllocationPerPerson,
      additionalSpaceM2: 0,
      totalSpaceAllowed: 0,
      maxOccupants: 1,
      restrictions: [],
      warnings: [],
      notes: [],
    };

    // Check age requirement
    const age = this.calculateAge(applicant.dateOfBirth);
    if (age < 18) {
      result.eligible = false;
      result.restrictions.push('Applicant must be at least 18 years old');
      return result;
    }

    // Check criminal record
    if (criminalRecord.status === 'violation') {
      result.warnings.push(
        'Applicant has criminal violations. Manual review required.'
      );
      // Don't disqualify, but flag for review
    }

    // Validate family structure
    const familyValidation = this.validateFamilyRelations(
      applicant,
      dependents
    );
    if (!familyValidation.valid) {
      result.eligible = false;
      result.restrictions.push(...familyValidation.errors);
      return result;
    }

    // Calculate space allocation
    const spaceAllocation = this.calculateSpaceAllocation({
      applicantId: applicant.id,
      adults: [applicant],
      children: dependents.filter((d) => d.relationship === 'child'),
      spouse: dependents.find((d) => d.relationship === 'spouse'),
    });

    result.baseSpaceM2 = spaceAllocation.baseSpace;
    result.additionalSpaceM2 = spaceAllocation.additionalSpace;
    result.totalSpaceAllowed = spaceAllocation.totalSpace;
    result.maxOccupants = spaceAllocation.maxOccupants;
    result.notes.push(`Space calculation: ${spaceAllocation.details}`);

    // Check family size limits
    const totalFamilyMembers = 1 + dependents.length;
    if (totalFamilyMembers > this.maxFamilyMembers) {
      result.restrictions.push(
        `Family exceeds maximum members (${this.maxFamilyMembers})`
      );
      result.eligible = false;
    }

    result.eligible = result.restrictions.length === 0;
    return result;
  }

  /**
   * Familienstruktur validieren
   */
  validateFamilyRelations(
    applicant: PersonalData,
    dependents: Dependent[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for multiple spouses
    const spouses = dependents.filter((d) => d.relationship === 'spouse');
    if (spouses.length > 1) {
      errors.push('Only one spouse allowed per registration');
    }

    // Check spouse validity
    for (const spouse of spouses) {
      const spouseAge = this.calculateAge(spouse.dateOfBirth);
      if (spouseAge < 18) {
        errors.push('Spouse must be at least 18 years old');
      }
    }

    // Check children validity
    const children = dependents.filter((d) => d.relationship === 'child');
    for (const child of children) {
      const childAge = this.calculateAge(child.dateOfBirth);
      if (childAge >= 18) {
        errors.push(`Child ${child.firstName} is 18 or older`);
      }

      // Verify guardianship
      if (child.guardianId !== applicant.id && spouses.length === 0) {
        errors.push(
          `Guardian ${child.guardianId} not registered with application`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Platzberechnung durchführen
   */
  calculateSpaceAllocation(household: {
    applicantId: string;
    adults: PersonalData[];
    children: Dependent[];
    spouse?: Dependent;
  }): {
    baseSpace: number;
    additionalSpace: number;
    totalSpace: number;
    maxOccupants: number;
    details: string;
  } {
    const totalAdults = household.adults.length;
    const totalChildren = household.children.length;
    const hasSpouse = !!household.spouse;

    const baseSpace = this.baseAllocationPerPerson * totalAdults;
    let additionalSpace = 0;

    // Additional space for spouse
    if (hasSpouse) {
      additionalSpace += this.spaceForSpouse;
    }

    // Additional space for children
    additionalSpace += totalChildren * this.spacePerChild;

    const totalSpace = baseSpace + additionalSpace;
    const maxOccupants = totalAdults + totalChildren + (hasSpouse ? 1 : 0);

    const details =
      `${totalAdults} adult(s) × ${this.baseAllocationPerPerson}m² ` +
      (additionalSpace > 0
        ? `+ ${additionalSpace}m² (spouse: ${hasSpouse ? this.spaceForSpouse : 0}m², ${totalChildren} child/ren: ${totalChildren * this.spacePerChild}m²)`
        : '');

    return {
      baseSpace,
      additionalSpace,
      totalSpace,
      maxOccupants,
      details,
    };
  }

  /**
   * Alter berechnen
   */
  private calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const month = today.getMonth() - birth.getMonth();

    if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Berechtigungsanspruch prüfen
   */
  isTransferableToThirdParty(): boolean {
    // Registration is NEVER transferable to third parties
    return false;
  }

  /**
   * Konfiguration abrufen
   */
  getConfig(): {
    baseAllocationPerPerson: number;
    spacePerChild: number;
    spaceForSpouse: number;
    maxFamilyMembers: number;
  } {
    return {
      baseAllocationPerPerson: this.baseAllocationPerPerson,
      spacePerChild: this.spacePerChild,
      spaceForSpouse: this.spaceForSpouse,
      maxFamilyMembers: this.maxFamilyMembers,
    };
  }
}
