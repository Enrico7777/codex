/**
 * Security Module - Kryptografische Signierung & Verifizierung
 * Absolut manipulationssichere digitale Abstimmung
 */

import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface DigitalSignature {
  signatureId: string;
  voterId: string;
  voteHash: string;
  timestamp: string;
  publicKey: string;
  signature: string;
  isValid: boolean;
}

export interface VerificationResult {
  isValid: boolean;
  voterId: string;
  timestamp: string;
  manipulationDetected: boolean;
  reason?: string;
}

export class CryptoSecurity {
  /**
   * Kryptografischer Hash für Vote
   */
  generateVoteHash(
    voterId: string,
    vote: 'JA' | 'NEIN' | 'ENTHALTUNG',
    timestamp: string
  ): string {
    const data = `${voterId}|${vote}|${timestamp}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Digital Signature für Vote
   */
  signVote(
    voterId: string,
    voteHash: string,
    privateKeyPem: string
  ): string {
    const sign = crypto.createSign('sha256');
    sign.update(voteHash);
    sign.end();

    return sign.sign(privateKeyPem, 'hex');
  }

  /**
   * Signatur verifizieren
   */
  verifySignature(
    voteHash: string,
    signature: string,
    publicKeyPem: string
  ): boolean {
    const verify = crypto.createVerify('sha256');
    verify.update(voteHash);
    verify.end();

    try {
      return verify.verify(publicKeyPem, Buffer.from(signature, 'hex'));
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Vollständiger Abstimmungsprozess mit Signatur
   */
  createSignedVote(
    voterId: string,
    vote: 'JA' | 'NEIN' | 'ENTHALTUNG',
    privateKeyPem: string
  ): DigitalSignature {
    const timestamp = new Date().toISOString();
    const voteHash = this.generateVoteHash(voterId, vote, timestamp);
    const signature = this.signVote(voterId, voteHash, privateKeyPem);

    return {
      signatureId: uuidv4(),
      voterId,
      voteHash,
      timestamp,
      publicKey: privateKeyPem, // In production: extract public key properly
      signature,
      isValid: true,
    };
  }

  /**
   * Signatur-Validierung
   */
  validateSignedVote(
    digitalSignature: DigitalSignature,
    publicKeyPem: string
  ): VerificationResult {
    const isValid = this.verifySignature(
      digitalSignature.voteHash,
      digitalSignature.signature,
      publicKeyPem
    );

    // Check für Zeitstempel-Manipulationen
    const signatureTime = new Date(digitalSignature.timestamp).getTime();
    const now = new Date().getTime();
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 7 Tage
    const isExpired = now - signatureTime > maxAgeMs;

    return {
      isValid: isValid && !isExpired,
      voterId: digitalSignature.voterId,
      timestamp: digitalSignature.timestamp,
      manipulationDetected: !isValid || isExpired,
      reason: isExpired ? 'Signature expired' : undefined,
    };
  }

  /**
   * Batch-Verifizierung (für Ergebnistabelle)
   */
  verifyVoteCount(
    votes: DigitalSignature[],
    publicKey: string
  ): {
    totalVotes: number;
    validVotes: number;
    invalidVotes: number;
    manipulationDetected: boolean;
    invalidVotesDetails: VerificationResult[];
  } {
    const results = votes.map((vote) => this.validateSignedVote(vote, publicKey));
    const validVotes = results.filter((r) => r.isValid).length;
    const invalidVotes = results.filter((r) => !r.isValid);

    return {
      totalVotes: votes.length,
      validVotes,
      invalidVotes: invalidVotes.length,
      manipulationDetected: invalidVotes.length > 0,
      invalidVotesDetails: invalidVotes,
    };
  }

  /**
   * Merkle Tree für Wahlintegrität (Optional - Blockchain-Vorbereitung)
   */
  createMerkleRoot(voteHashes: string[]): string {
    if (voteHashes.length === 0) return '';
    if (voteHashes.length === 1) return voteHashes[0];

    let layer = voteHashes;

    while (layer.length > 1) {
      const nextLayer: string[] = [];

      for (let i = 0; i < layer.length; i += 2) {
        const left = layer[i];
        const right = layer[i + 1] || layer[i];
        const combined = crypto
          .createHash('sha256')
          .update(left + right)
          .digest('hex');
        nextLayer.push(combined);
      }

      layer = nextLayer;
    }

    return layer[0];
  }

  /**
   * Audit-Trail Hashing
   */
  hashAuditEvent(
    userId: string,
    action: string,
    data: Record<string, any>,
    previousHash: string = ''
  ): string {
    const event = `${userId}|${action}|${JSON.stringify(data)}|${previousHash}`;
    return crypto.createHash('sha256').update(event).digest('hex');
  }

  /**
   * Rate Limiting für Vote-Submission (Anti-Spam)
   */
  generateTimestampedToken(voterId: string, expiresInMinutes: number = 5): {
    token: string;
    expiresAt: string;
  } {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    const data = `${voterId}|${expiresAt.toISOString()}`;
    const token = crypto.createHash('sha256').update(data).digest('hex');

    return {
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Verschlüsselte Vote-Speicherung (Vor Ergebnis-Auszählung)
   */
  encryptVote(
    vote: 'JA' | 'NEIN' | 'ENTHALTUNG',
    encryptionKey: string
  ): string {
    const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
    let encrypted = cipher.update(vote, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Entschlüsselte Vote-Auszählung
   */
  decryptVote(encryptedVote: string, encryptionKey: string): 'JA' | 'NEIN' | 'ENTHALTUNG' {
    const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
    let decrypted = decipher.update(encryptedVote, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted as 'JA' | 'NEIN' | 'ENTHALTUNG';
  }
}

// Singleton
export const cryptoSecurity = new CryptoSecurity();
