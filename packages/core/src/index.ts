import { db, type NewVacancy, type Vacancy } from '@job-parser/db';
import { vacancies } from '@job-parser/db/src/models/vacancy';
import { hash } from 'crypto';

function makeHash(
   title: NewVacancy['title'],
   description: NewVacancy['description'],
) {
   const fields = [
      title.trim().toLowerCase(),
      description.trim().toLowerCase(),
   ];

   return hash('md5', fields.toString());
}

export function ingestVacancies(newVacancies: Omit<NewVacancy, 'hash'>[]) {
   const hashed: NewVacancy[] = newVacancies.map((v) => {
      return { ...v, hash: makeHash(v.title, v.description) };
   });

   const unique = hashed.filter((h1) =>
      hashed.filter((h2) => h1.hash === h2.hash).length === 1 ? true : false,
   );

   return db
      .insert(vacancies)
      .values(unique)
      .onConflictDoNothing({ target: vacancies.hash });
}

export type IngestVacanciesReturn = Awaited<ReturnType<typeof ingestVacancies>>;
