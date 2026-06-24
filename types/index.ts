import type { Database as DB } from './database.types';

export * from './post';
export * from './user';
export * from './chat';
export * from './filter';
export * from './profile';

// Generisani tipovi iz Supabase šeme (T2.2). Helper-i za eksplicitnu upotrebu:
//   Tables<'profiles'>  → Row tip tabele
//   TablesInsert<'blahs'>, TablesUpdate<'posts'>
export type { Database, Json } from './database.types';

export type Tables<T extends keyof DB['public']['Tables']> =
  DB['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof DB['public']['Tables']> =
  DB['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof DB['public']['Tables']> =
  DB['public']['Tables'][T]['Update'];
