import { fetchWithRetry } from '@job-parser/shared';

const url_d =
   'https://justjoin.it/api/candidate-api/offers?from=0&itemsCount=100&categories=javascript&cityRadius=30&currency=pln&orderBy=descending&sortBy=publishedAt&keywordType=skill&isPromoted=true';

type Cursor<T> = T;

type Vacancy = {
   publishedAt: string;
};

type Filter = {
   language: 'javascript' | 'typescript' | 'c';
   tech: 'react' | 'next.js' | 'angular';
   level: 'intern' | 'junior' | 'middle' | 'senior';
};

type FilterOption = Extract<Filter[keyof Filter], string>;
type FilterTechOption = Extract<Filter['tech'] | Filter['language'], string>;

type SemanticTechEdge = {
   [K in FilterTechOption]?: FilterTechOption[];
};

const semanticTechSheet: SemanticTechEdge[] = [
   { react: ['javascript'] },
   {
      'next.js': ['javascript', 'react'],
   },
   { angular: ['javascript'] },
];

const normilizeTechs = (techs: FilterTechOption[]): FilterTechOption[] => {
   const normilizedTechsStack = new Set<FilterTechOption>();

   for (const tech of techs) {
      const semanticEdge = semanticTechSheet.find((i) => tech in i);

      if (semanticEdge) {
         const deps = semanticEdge[
            tech as keyof SemanticTechEdge
         ] as FilterTechOption[];

         deps.forEach((d) => normilizedTechsStack.add(d));
      }

      normilizedTechsStack.add(tech as keyof SemanticTechEdge);
   }

   return [...normilizedTechsStack];
};

const normilizeOptions = ({
   tech,
   language,
   ...rest
}: Filter): FilterOption[] => {
   const normilizedTechOptions = normilizeTechs([tech, language]);
   const restOptions = Object.values(rest);

   return [...normilizedTechOptions, ...restOptions];
};

type NormalizedOptions = ReturnType<typeof normilizeOptions>;

const assembleUrl = ({
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

type CursorRegistry = Map<NormalizedOptions, Cursor<Date>>;

const createCursorsRegistry = (): CursorRegistry => {
   return new Map<NormalizedOptions, Cursor<Date>>();
};

const setRecord = (
   filter: Filter,
   cursor: Cursor<Date>,
   cursorRegistry: CursorRegistry,
) => {
   const filterOptions = normilizeOptions(filter);

   let compatibleKey = null;

   cursorRegistry.forEach((v, k, m) => {
      if (k.length !== filterOptions.length) return;

      const compatible = k.every((i) => filterOptions.includes(i));

      if (compatible) {
         compatibleKey = k;
      }
   });

   if (compatibleKey) {
      cursorRegistry.set(compatibleKey, cursor);
   } else {
      cursorRegistry.set(filterOptions, cursor);
   }
};

const getBestCursor = (
   filter: Filter,
   cursorRegistry: CursorRegistry,
): Cursor<Date> => {
   const filterOptions = normilizeOptions(filter);
   const compatibleCursors: Cursor<Date>[] = [];

   cursorRegistry.forEach((v, k, m) => {
      if (k.length > filterOptions.length) return;

      const compatible = k.every((option) => filterOptions.includes(option));

      if (compatible) {
         compatibleCursors.push(v);
      }
   });

   const bestCursor: Cursor<Date> = compatibleCursors.reduce(
      (a, b) => (a > b ? a : b),
      new Date(0),
   );

   return bestCursor;
};

const experienceLevelMap: { [K in Filter['level']]: string } = {
   intern: 'junior',
   junior: 'junior',
   middle: 'mid',
   senior: 'senior',
};

async function parseJustJoinIt(
   options: Filter,
   cursor: Cursor<Date>,
): Promise<{ data: Vacancy[]; cursor: Cursor<Date> }> {
   const vacancies: Vacancy[] = [];

   const url = assembleUrl({
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
   const jobs: Vacancy[] = json.data;

   const lastRunDate = cursor;

   jobs.every((job) => {
      const publishedAt = new Date(job.publishedAt);

      const isFresh = publishedAt > lastRunDate;

      if (isFresh) {
         vacancies.push(job);
      }

      return isFresh;
   });

   return { data: vacancies, cursor: new Date(Date.now()) };
}

export { parseJustJoinIt, setRecord, getBestCursor, createCursorsRegistry };

export type { Filter };
