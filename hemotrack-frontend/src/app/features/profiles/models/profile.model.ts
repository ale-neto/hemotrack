export type ProfileRelationship = 'titular' | 'cônjuge' | 'filho(a)' | 'pai' | 'mãe' | 'outro';
export type ProfileSex = 'masculino' | 'feminino' | 'outro';

export interface Profile {
  id: number;
  userId: number;
  name: string;
  relationship: ProfileRelationship;
  birthDate: string | null;
  sex: ProfileSex | null;
  weight: number | null;
  height: number | null;
  diseases: string[];
  medications: string[];
  isDefault: boolean;
  bmi?: number | null;
  age?: number | null;
}
