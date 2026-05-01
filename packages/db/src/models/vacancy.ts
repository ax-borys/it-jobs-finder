import { integer, pgTable, text } from 'drizzle-orm/pg-core';
import { timestamps } from '../helpers/timestamps';

export const vacancies = pgTable('vacancies', {
   id: integer().primaryKey().generatedAlwaysAsIdentity(),
   title: text().notNull(),
   description: text().notNull(),
   experienceLevel: text('experience_level').notNull(),
   skills: text().array().notNull(),
   salaryMin: integer('salary_min'),
   salaryMax: integer('salary_max'),
   hash: text().unique().notNull(),
   ...timestamps,
});

export type Vacancy = typeof vacancies.$inferSelect;
export type NewVacancy = typeof vacancies.$inferInsert;
