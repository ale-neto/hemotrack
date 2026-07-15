export type ProfileRelationship = 'titular' | 'cônjuge' | 'filho(a)' | 'pai' | 'mãe' | 'outro';
export type ProfileSex = 'masculino' | 'feminino' | 'outro';

/** Opções para selects — colocadas junto do model para não duplicar em cada componente que precisar exibi-las. */
export const RELATIONSHIP_OPTIONS: { label: string; value: ProfileRelationship }[] = [
  { label: 'Titular', value: 'titular' },
  { label: 'Cônjuge', value: 'cônjuge' },
  { label: 'Filho(a)', value: 'filho(a)' },
  { label: 'Pai', value: 'pai' },
  { label: 'Mãe', value: 'mãe' },
  { label: 'Outro', value: 'outro' },
];

export const SEX_OPTIONS: { label: string; value: ProfileSex }[] = [
  { label: 'Masculino', value: 'masculino' },
  { label: 'Feminino', value: 'feminino' },
  { label: 'Outro', value: 'outro' },
];

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
