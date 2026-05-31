/**
 * Capacity Management - Ressourcen-Allokation & Wartelisten
 * Verhindert Überlastung der Services und Wohneinheiten
 */

import { v4 as uuidv4 } from 'uuid';

export interface ResourceCapacity {
  resourceId: string;
  resourceType: 'housing' | 'dining' | 'transport' | 'education' | 'healthcare';
  maxCapacity: number;
  currentUsage: number;
  utilizationPercent: number;
  availableSlots: number;
}

export interface WaitlistEntry {
  entryId: string;
  userId: string;
  resourceType: string;
  requestedAt: string;
  priority: 'standard' | 'urgent' | 'special-needs';
  position: number;
  estimatedWaitDays: number;
  status: 'waiting' | 'approved' | 'cancelled' | 'fulfilled';
}

export interface AllocationDecision {
  userId: string;
  resourceId: string;
  decision: 'allocated' | 'waitlisted' | 'denied';
  reason?: string;
  allocatedUntil?: string;
}

export class CapacityManager {
  private capacities: Map<string, ResourceCapacity> = new Map();
  private waitlists: Map<string, WaitlistEntry[]> = new Map();
  private allocations: Map<string, AllocationDecision[]> = new Map();

  /**
   * Ressource registrieren
   */
  registerResource(
    resourceId: string,
    resourceType: string,
    maxCapacity: number
  ): ResourceCapacity {
    const capacity: ResourceCapacity = {
      resourceId,
      resourceType: resourceType as any,
      maxCapacity,
      currentUsage: 0,
      utilizationPercent: 0,
      availableSlots: maxCapacity,
    };

    this.capacities.set(resourceId, capacity);
    this.waitlists.set(resourceId, []);
    this.allocations.set(resourceId, []);

    return capacity;
  }

  /**
   * Verfügbarkeit prüfen
   */
  checkAvailability(resourceId: string): ResourceCapacity | null {
    return this.capacities.get(resourceId) || null;
  }

  /**
   * Ressource allokieren oder auf Waitlist setzen
   */
  allocateResource(
    userId: string,
    resourceId: string,
    priority: 'standard' | 'urgent' | 'special-needs' = 'standard'
  ): AllocationDecision {
    const capacity = this.capacities.get(resourceId);
    if (!capacity) {
      return {
        userId,
        resourceId,
        decision: 'denied',
        reason: 'Resource not found',
      };
    }

    // Check für verfügbare Slots
    if (capacity.availableSlots > 0) {
      capacity.currentUsage++;
      capacity.availableSlots--;
      capacity.utilizationPercent = (capacity.currentUsage / capacity.maxCapacity) * 100;

      const decision: AllocationDecision = {
        userId,
        resourceId,
        decision: 'allocated',
        allocatedUntil: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const allocations = this.allocations.get(resourceId) || [];
      allocations.push(decision);
      this.allocations.set(resourceId, allocations);

      console.log(`✓ Resource ${resourceId} allocated to ${userId}`);
      return decision;
    }

    // Auf Waitlist setzen
    const waitlists = this.waitlists.get(resourceId) || [];
    const waitlistEntry: WaitlistEntry = {
      entryId: uuidv4(),
      userId,
      resourceType: capacity.resourceType,
      requestedAt: new Date().toISOString(),
      priority,
      position: waitlists.length + 1,
      estimatedWaitDays: Math.ceil((waitlists.length + 1) / (capacity.maxCapacity / 30)),
      status: 'waiting',
    };

    waitlists.push(waitlistEntry);
    this.waitlists.set(resourceId, waitlists);

    console.log(
      `⏳ User ${userId} added to waitlist for ${resourceId} (Position: ${waitlistEntry.position})`
    );

    return {
      userId,
      resourceId,
      decision: 'waitlisted',
      reason: `Position ${waitlistEntry.position} - Estimated wait: ${waitlistEntry.estimatedWaitDays} days`,
    };
  }

  /**
   * Ressource freigeben (wenn User auszieht)
   */
  releaseResource(userId: string, resourceId: string): boolean {
    const capacity = this.capacities.get(resourceId);
    if (!capacity || capacity.currentUsage === 0) {
      return false;
    }

    capacity.currentUsage--;
    capacity.availableSlots++;
    capacity.utilizationPercent = (capacity.currentUsage / capacity.maxCapacity) * 100;

    // Auto-Promotion von Waitlist
    this.promoteFromWaitlist(resourceId);

    console.log(`✓ Resource ${resourceId} released by ${userId}`);
    return true;
  }

  /**
   * Nächste Person von Waitlist promoten
   */
  private promoteFromWaitlist(resourceId: string): void {
    const capacity = this.capacities.get(resourceId);
    const waitlist = this.waitlists.get(resourceId);

    if (!capacity || !waitlist || waitlist.length === 0) {
      return;
    }

    // Sortiere nach Priorität + Position
    const priorityOrder = { 'urgent': 0, 'special-needs': 1, 'standard': 2 };
    waitlist.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || a.position - b.position
    );

    const nextEntry = waitlist.shift();
    if (nextEntry) {
      nextEntry.status = 'approved';
      capacity.currentUsage++;
      capacity.availableSlots--;
      capacity.utilizationPercent = (capacity.currentUsage / capacity.maxCapacity) * 100;

      console.log(`✓ Promoted ${nextEntry.userId} from waitlist`);
    }
  }

  /**
   * Waitlist-Status abrufen
   */
  getWaitlistStatus(resourceId: string): WaitlistEntry[] {
    return (this.waitlists.get(resourceId) || []).filter((e) => e.status === 'waiting');
  }

  /**
   * Alle Kapazitäten übersicht
   */
  getCapacityOverview(): {
    highUtilization: ResourceCapacity[];
    normalUtilization: ResourceCapacity[];
    lowUtilization: ResourceCapacity[];
  } {
    const all = Array.from(this.capacities.values());

    return {
      highUtilization: all.filter((c) => c.utilizationPercent >= 80),
      normalUtilization: all.filter((c) => c.utilizationPercent >= 50 && c.utilizationPercent < 80),
      lowUtilization: all.filter((c) => c.utilizationPercent < 50),
    };
  }

  /**
   * Ressourcen-Bottleneck identifizieren
   */
  identifyBottlenecks(): ResourceCapacity[] {
    return Array.from(this.capacities.values()).filter(
      (c) => c.utilizationPercent >= 90 && c.availableSlots <= 5
    );
  }

  /**
   * Service-Level-Vereinbarung prüfen (SLA)
   */
  checkSLA(
    resourceId: string,
    maxWaitDays: number = 30
  ): {
    slaViolations: WaitlistEntry[];
    violationRate: number;
  } {
    const waitlist = this.waitlists.get(resourceId) || [];
    const violations = waitlist.filter(
      (e) => e.status === 'waiting' && e.estimatedWaitDays > maxWaitDays
    );

    return {
      slaViolations: violations,
      violationRate: (violations.length / waitlist.length) * 100,
    };
  }
}

export const capacityManager = new CapacityManager();
