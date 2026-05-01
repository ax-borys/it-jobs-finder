import * as cheerio from 'cheerio';
import { convert } from 'html-to-text';

import { fetchWithRetry } from '@job-parser/shared';
import { NewVacancy, Vacancy } from '@job-parser/db';

type Cursor<T> = T;

type Category = {
   key: string;
   parentKey: string | null;
};

type Location = {
   city: string;
   street: string;
   latitude: number;
   longitude: number;
   slug: string;
};

type EmploymentType = {
   from: number;
   fromPerUnit: number;
   to: number;
   toPerUnit: number;
   currency: string;
   currencySource: 'original' | 'conversion';
   type: 'b2b' | 'mandate_contract' | 'permanent';
   unit: string;
   gross: boolean;
};

type Skill = {
   name: string;
   level: number;
};

type Offer = {
   guid: string;
   slug: string;
   title: string;
   workplaceType: string;
   workingTime: string;
   experienceLevel: string;
   category: Category;
   city: string;
   street: string;
   latitude: number;
   longitude: number;
   isRemoteInterview: boolean;
   companyName: string;
   companyLogoThumbUrl: string;
   publishedAt: string;
   isOpenToHireUkrainians: boolean;
   locations: Location[];
   employmentTypes: EmploymentType[];
   requiredSkills: Skill[];
   niceToHaveSkills: Skill[];
   languages: string[];
   isPromoted: boolean;
   isSuperOffer: boolean;
   applyMethod: string;
   lastPublishedAt: string;
   expiredAt: string;
   description: string;
};

type Filter = {
   language: 'javascript' | 'typescript' | 'c';
   tech: 'react' | 'next.js' | 'angular';
   level: 'intern' | 'junior' | 'middle' | 'senior';
};

type FilterOption = Extract<Filter[keyof Filter], string>;
type TechOption = Extract<Filter['tech'] | Filter['language'], string>;

type TechDependencies = {
   [K in TechOption]?: TechOption[];
};

const techDependencies: TechDependencies[] = [
   { react: ['javascript'] },
   { 'next.js': ['javascript', 'react'] },
   { angular: ['javascript'] },
];

const normalizeTechs = (techs: TechOption[]): TechOption[] => {
   const normalizedTechSet = new Set<TechOption>();

   for (const tech of techs) {
      const depEntry = techDependencies.find((i) => tech in i);

      if (depEntry) {
         const deps = depEntry[tech as keyof TechDependencies] as TechOption[];
         deps.forEach((d) => normalizedTechSet.add(d));
      }

      normalizedTechSet.add(tech as keyof TechDependencies);
   }

   return [...normalizedTechSet];
};

const normalizeFilter = ({
   tech,
   language,
   ...rest
}: Filter): FilterOption[] => {
   const normalizedTechOptions = normalizeTechs([tech, language]);
   const restOptions = Object.values(rest);

   return [...normalizedTechOptions, ...restOptions];
};

type NormalizedFilter = ReturnType<typeof normalizeFilter>;

const buildUrl = ({
   categories,
   keywords,
   experienceLevel,
}: {
   categories?: string;
   keywords?: string;
   experienceLevel?: string;
}) => {
   const url = new URL('/api/candidate-api/offers', 'https://justjoin.it');

   if (categories) {
      url.searchParams.set('categories', categories);
   }

   if (keywords) {
      url.searchParams.set(
         'keywords',
         keywords.charAt(0).toUpperCase() + keywords.slice(1),
      );
   }

   if (experienceLevel) {
      url.searchParams.set('experienceLevels', experienceLevel);
   }

   url.searchParams.set('cityRadius', '30');
   url.searchParams.set('keywordType', 'skill');
   url.searchParams.set('currency', 'pln');

   return url;
};

type CursorRegistry = Map<NormalizedFilter, Cursor<Date>>;

const createCursorRegistry = (): CursorRegistry => {
   return new Map<NormalizedFilter, Cursor<Date>>();
};

const upsertCursor = (
   filter: Filter,
   cursor: Cursor<Date>,
   cursorRegistry: CursorRegistry,
) => {
   const filterOptions = normalizeFilter(filter);

   let matchedKey: NormalizedFilter | null = null;

   cursorRegistry.forEach((_value, key) => {
      if (key.length !== filterOptions.length) return;

      const isMatch = key.every((i) => filterOptions.includes(i));

      if (isMatch) {
         matchedKey = key;
      }
   });

   if (matchedKey) {
      cursorRegistry.set(matchedKey, cursor);
   } else {
      cursorRegistry.set(filterOptions, cursor);
   }
};

const getBestCursor = (
   filter: Filter,
   cursorRegistry: CursorRegistry,
): Cursor<Date> => {
   const filterOptions = normalizeFilter(filter);
   const matchingCursors: Cursor<Date>[] = [];

   cursorRegistry.forEach((cursor, key) => {
      if (key.length > filterOptions.length) return;

      const isMatch = key.every((option) => filterOptions.includes(option));

      if (isMatch) {
         matchingCursors.push(cursor);
      }
   });

   return matchingCursors.reduce((a, b) => (a > b ? a : b), new Date(0));
};

const experienceLevelMap: { [K in Filter['level']]: string } = {
   intern: 'junior',
   junior: 'junior',
   middle: 'mid',
   senior: 'senior',
};

const fetchDescription = async (url: URL | string) => {
   const response: Response = await fetchWithRetry(url, undefined, {
      maxRetries: 6,
      baseDelay: 5000,
      maxDelay: 1000 * 300,
   });

   const html = await response.text();

   const $ = cheerio.load(html);

   const descriptionElement = $('h3:contains("Job description")').next('div');

   const text = convert($.html(descriptionElement));

   return text;
};

async function parseJustJoinIt(
   options: Filter,
   cursor: Cursor<Date>,
): Promise<{ data: Omit<NewVacancy, 'hash'>[]; cursor: Cursor<Date> }> {
   const vacancies: Offer[] = [];

   const url = buildUrl({
      categories: options.language,
      keywords: options.tech,
      experienceLevel: experienceLevelMap[options.level],
   });

   const response = await fetchWithRetry(url, undefined, {
      maxRetries: 6,
      baseDelay: 5000,
      maxDelay: 1000 * 300,
   });

   const json = await response.json();
   const jobs: Offer[] = json.data;

   jobs.every((job) => {
      const publishedAt = new Date(job.publishedAt);
      const isFresh = publishedAt > cursor;

      if (isFresh) {
         vacancies.push(job);
      }

      return isFresh;
   });

   const enrichedVacancies: Offer[] = [];

   for (const vacancy of vacancies) {
      const offerUrl = `https://justjoin.it/job-offer/${vacancy.slug}`;
      const description = await fetchDescription(offerUrl);

      enrichedVacancies.push({ ...vacancy, description });
   }

   const mappedVacancies = enrichedVacancies.map(
      (enrichedVacancy): Omit<NewVacancy, 'hash'> => ({
         title: enrichedVacancy.title,
         description: enrichedVacancy.description,
         experienceLevel: enrichedVacancy.experienceLevel,
         salaryMin: enrichedVacancy.employmentTypes[0].from,
         salaryMax: enrichedVacancy.employmentTypes[0].to,
         skills: [
            enrichedVacancy.category.key,
            ...enrichedVacancy.requiredSkills.map((s) => s.name),
            ...enrichedVacancy.niceToHaveSkills.map((s) => s.name),
         ],
      }),
   );

   return { data: mappedVacancies, cursor: new Date(Date.now()) };
}

export { parseJustJoinIt, upsertCursor, getBestCursor, createCursorRegistry };

export type { Filter };
