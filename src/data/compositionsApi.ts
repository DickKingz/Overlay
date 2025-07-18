import { db } from './firebase';
import { collection, addDoc, getDocs, updateDoc, doc, query, where, onSnapshot, deleteDoc, setDoc } from 'firebase/firestore';
import { TeamComposition } from '../types';

function findNonSerializable(obj: Record<string, any>) {
  for (const key in obj) {
    try {
      JSON.stringify(obj[key]);
    } catch (e) {
      console.error('Non-serializable field:', key, obj[key]);
    }
  }
}

function sanitizeForFirestore(data: any): any {
  console.log('DEBUG: sanitizeForFirestore input:', data);
  
  if (data === null || data === undefined) {
    return null;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        // Special handling for weaponBonds
        if (key === 'weaponBonds' && typeof value === 'object') {
          console.log('DEBUG: Processing weaponBonds:', value);
          const sanitizedBonds: Record<string, any> = {};
          for (const [weaponId, illuvial] of Object.entries(value)) {
            if (illuvial && typeof illuvial === 'object') {
              sanitizedBonds[weaponId] = sanitizeForFirestore(illuvial);
            }
          }
          sanitized[key] = sanitizedBonds;
          console.log('DEBUG: Sanitized weaponBonds:', sanitized[key]);
          continue;
        }

        // Special handling for recommendedWeapons
        if (key === 'recommendedWeapons' && Array.isArray(value)) {
          console.log('DEBUG: Processing recommendedWeapons:', value);
          sanitized[key] = value.map((rec: any) => ({
            weapon: {
              id: rec.weapon.id || rec.weapon.Name || rec.weapon.name,
              name: rec.weapon.Name || rec.weapon.name,
              type: rec.weapon.type || 'unknown',
              affinity: rec.weapon.affinity || '',
              class: rec.weapon.class || '',
              affinities: rec.weapon.affinities || [],
              classes: rec.weapon.classes || [],
              stats: rec.weapon.stats || {},
              description: rec.weapon.description || '',
              abilities: rec.weapon.abilities || []
            },
            amps: Array.isArray(rec.amps) ? rec.amps.map((amp: any) => ({
              id: amp.id || amp.Name || amp.name,
              name: amp.Name || amp.name,
              description: amp.DisplayDescriptionNormalized || amp.DisplayDescription || amp.description || '',
              type: amp.type || 'unknown',
              stats: amp.stats || {},
              abilities: amp.abilities || []
            })) : []
          }));
          console.log('DEBUG: Sanitized recommendedWeapons:', sanitized[key]);
          continue;
        }

        // Special handling for suitAmps
        if (key === 'suitAmps' && Array.isArray(value)) {
          console.log('DEBUG: Processing suitAmps:', value);
          sanitized[key] = value.map((amp: any) => ({
            id: amp.id || amp.Name || amp.name,
            name: amp.Name || amp.name,
            type: amp.type || 'unknown',
            description: amp.DisplayDescriptionNormalized || amp.DisplayDescription || amp.description || '',
            stats: amp.stats || {},
            abilities: Array.isArray(amp.abilities) ? amp.abilities.map((ability: any) => ({
              name: ability.name,
              description: ability.description
            })) : []
          }));
          console.log('DEBUG: Sanitized suitAmps:', sanitized[key]);
          continue;
        }

        // Special handling for strategy data
        if (key === 'phases' && Array.isArray(value)) {
          sanitized[key] = value.map((phase: { phase: string; strategy: string }) => ({
            phase: phase.phase,
            strategy: phase.strategy || ''
          }));
          continue;
        }

        if (key === 'rounds' && Array.isArray(value)) {
          sanitized[key] = value.map((round: { start: number; end: number; notes: string }) => ({
            start: round.start,
            end: round.end,
            notes: round.notes || ''
          }));
          continue;
        }

        // Default handling for other fields
        sanitized[key] = sanitizeForFirestore(value);
      }
    }
    console.log('DEBUG: Final sanitized object:', sanitized);
    return sanitized;
  }

  return data;
}

// Add a new composition
export const addComposition = async (comp: Partial<TeamComposition> & { status: string; tier?: string | null }) => {
  console.log('DEBUG: About to save submission:', comp);

  const fields = Object.keys(comp);
  for (const key of fields) {
    try {
      JSON.stringify((comp as Record<string, any>)[key]);
    } catch (e) {
      console.error('Non-serializable field:', key, (comp as Record<string, any>)[key]);
    }
  }
  findNonSerializable(comp as Record<string, any>);
  const sanitizedComp = sanitizeForFirestore(comp);
  await addDoc(collection(db, 'compositions'), sanitizedComp);
};

// Get all compositions (optionally filtered)
export const getCompositions = async (status?: string, tier?: string) => {
  let q: any = collection(db, 'compositions');
  const filters = [];
  if (status) filters.push(where('status', '==', status));
  if (tier) filters.push(where('tier', '==', tier));
  if (filters.length > 0) q = query(q, ...filters);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, any>) }));
};

// Promote a comp to tier list
export const promoteComposition = async (id: string, tier?: 'S' | 'A' | 'B' | 'C') => {
  const ref = doc(db, 'compositions', id);
  const updates: { status: string; tier?: 'S' | 'A' | 'B' | 'C' } = {
    status: 'approved'
  };
  if (tier) {
    updates.tier = tier;
  }
  await updateDoc(ref, updates);
};

// Demote a comp from tier list
export const demoteComposition = async (id: string) => {
  const ref = doc(db, 'compositions', id);
  await updateDoc(ref, { status: 'pending' });
};

// Delete a comp
export const deleteComposition = async (id: string) => {
  const ref = doc(db, 'compositions', id);
  await deleteDoc(ref);
};

// Real-time listener (optional)
export const listenToCompositions = (callback: (comps: any[]) => void, status?: string, tier?: string) => {
  let q: any = collection(db, 'compositions');
  const filters = [];
  if (status) filters.push(where('status', '==', status));
  if (tier) filters.push(where('tier', '==', tier));
  if (filters.length > 0) q = query(q, ...filters);
  return onSnapshot(q, (snapshot: any) => {
    callback(snapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as Record<string, any>) })));
  });
};

export const updateComposition = async (id: string, data: Partial<TeamComposition>) => {
  console.log('DEBUG: updateComposition raw input:', data);
  
  const ref = doc(db, 'compositions', id);
  // Remove any undefined values to avoid overwriting existing data
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );
  console.log('DEBUG: updateComposition after cleaning undefined:', cleanData);
  
  const fields = Object.keys(cleanData);
  for (const key of fields) {
    try {
      JSON.stringify(cleanData[key]);
    } catch (e) {
      console.error('Non-serializable field:', key, cleanData[key]);
    }
  }
  findNonSerializable(cleanData);
  const sanitizedData = sanitizeForFirestore(cleanData);
  console.log('DEBUG: updateComposition final sanitizedData:', sanitizedData);
  
  try {
    await setDoc(ref, sanitizedData, { merge: true });
    console.log('DEBUG: Successfully updated document with ID:', id);
  } catch (error) {
    console.error('DEBUG: Error updating document:', error);
    throw error;
  }
}; 