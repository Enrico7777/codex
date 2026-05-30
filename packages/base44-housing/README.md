# Base44 Housing Management Module

**Verwaltungs- und Reservierungssystem für die Zentralkugel-Sternstadt**

Dieses Modul verwaltet die komplette Wohneinheiten-Reservierung, Identifikation, Berechtigung und Services der Base44 Modellstadt.

## Features

### 🏠 Wohneinheiten-Verwaltung
- Numerierte Wohneinheiten (50 m² Grundanspruch pro Person)
- Erweiterbarkeit nach Bedarf
- 3D-Modell-Integration mit Verfügbarkeitsprüfung
- Koordinaten-basierte Verwaltung (r, theta, y)

### 👤 Identifikation & Berechtigung
- Vollständige Identifikationsprüfung erforderlich
- Familienstruktur: Kinder (<18 Jahre), Ehepartner
- Führungszeugnis für Straftäter
- Anmeldung nicht auf Dritte übertragbar

### 🍽️ Kostenlose Services
- ⭐ Sterne-Niveau Ernährung
- 🚚 Kostenlose Beförderung (Kugelservice)
- 🏫 Spezielles Schulystem & Interessens-/Fähigkeits-Struktur
- 🏛️ Kostenlose öffentliche Einrichtungen

### 📅 Besondere Ereignisse
- Ankoppelbare Kugeln für Geburten und Todesfälle
- Automatische Raumverwaltung bei Familienveränderungen

### ⚖️ Rechtliche Verwaltung
- Automatische Kündigung bei Normenverstößen
- Beiderseitige Rechtswahrung (keine Ansprüche)
- Postversand an Registrierungsbüro
- E-Mail-Bestätigung für alle Transaktionen

### 🗣️ Sprachgesteuerte 3D-Präsentation
- Natürlichsprachliche Abfragen
- Adaptive Modell-Präsentation basierend auf Fragen
- Automatische Führungen für Interessenten

## Installation

```bash
npm install @base44/housing-management
```

## Usage

### Registration
```javascript
import { HousingRegistration } from '@base44/housing-management/registration';

const registration = new HousingRegistration();

const result = await registration.submitApplication({
  applicant: {
    name: 'Max Mustermann',
    dateOfBirth: '1985-06-15',
    email: 'max@example.de',
    address: { /* ... */ }
  },
  dependents: [
    {
      name: 'Anna Mustermann',
      dateOfBirth: '2010-03-22',
      relationship: 'child'
    }
  ],
  backgroundCheck: {
    type: 'leading-document', // Führungszeugnis
    status: 'clean'
  }
});
```

### Unit Management
```javascript
import { HousingUnitManager } from '@base44/housing-management/units';

const unitManager = new HousingUnitManager();

// Get available units
const available = await unitManager.getAvailableUnits({
  minSize: 50, // m²
  cluster: 'A1',
  maxDistance: 1000 // meters to center
});

// Reserve a unit
const reservation = await unitManager.reserveUnit('Unit_A1_001', registrationId);
```

### Services & Compliance
```javascript
import { ComplianceManager } from '@base44/housing-management/compliance';

const compliance = new ComplianceManager();

// Check residency compliance
const status = await compliance.checkResidencyStatus(userId);

// Terminate residency (if required)
const termination = await compliance.terminateResidency(userId, reason);
```

## Registrierungsbüro-Adresse

```
Enrico Fritsche
Ricarda-Huch-Straße 7
02625 Bautzen
Deutschland
```

**E-Mail-Bestätigung:** Alle Anmeldungen werden per E-Mail bestätigt.
**Postweg:** Unterlagen sind post-wendend zurückzusenden.

## API Reference

### Registration Module
- `submitApplication(data)` - Neue Anmeldung einreichen
- `validateIdentity(user)` - Identität prüfen
- `checkCriminalRecord(user)` - Führungszeugnis prüfen
- `registerDependents(dependents)` - Angehörige registrieren

### Eligibility Module
- `checkEligibility(applicant)` - Gesamte Berechtigung prüfen
- `validateFamilyRelations(members)` - Familienstruktur validieren
- `calculateSpaceAllocation(household)` - Platzberechnung

### Units Module
- `getAvailableUnits(filters)` - Verfügbare Einheiten
- `reserveUnit(unitId, applicantId)` - Einheit reservieren
- `expandUnit(unitId, additionalSize)` - Einheit erweitern
- `getUnitDetails(unitId)` - Einheitsdetails

### Services Module
- `getDiningOptions(unitId)` - Sterne-Ernährung
- `getTransportSchedule(origin, destination)` - Beförderung
- `enrollInSchool(child, schoolType)` - Schulanmeldung
- `registerEventPod(type, date)` - Ereigniskugel

### Compliance Module
- `checkResidencyStatus(userId)` - Status prüfen
- `reportNormViolation(userId, violation)` - Verstoß melden
- `terminateResidency(userId, reason)` - Beendigung

### Model3D Module (Voice-Guided)
- `initializeModel()` - 3D-Modell laden
- `processVoiceQuery(query)` - Sprachfrage verarbeiten
- `updatePresentation(focusArea)` - Präsentation anpassen
- `generateGuidedTour(interests)` - Tour generieren

## Lizenz

Apache License 2.0 - siehe [LICENSE](../../LICENSE) für Details.

## Kontakt

**Base44 Zentralkugel-Sternstadt**
Enrico Fritsche
Ricarda-Huch-Straße 7
02625 Bautzen, Deutschland
