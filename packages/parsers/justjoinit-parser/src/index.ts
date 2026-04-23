const url =
   'https://justjoin.it/api/candidate-api/offers?from=0&itemsCount=100&categories=javascript&cityRadius=30&currency=pln&orderBy=descending&sortBy=publishedAt&keywordType=any&isPromoted=true';

type Cursor<T> = { ctx: T };

type Vacancy = {
   publishedAt: string;
};

async function parseJustJoinIt(c?: Cursor<{ lastHandledDate: Date }>) {
   const lastHandledDate = c?.ctx.lastHandledDate;

   const vacancies: Vacancy[] = [];

   while (true) {
      const response = await fetch(url);
      const json = await response.json();
      const jobs: Vacancy[] = json.data;

      jobs.every((job) => {
         const publishedAt = new Date(job.publishedAt);

         const isFresh =
            publishedAt.getTime() > (lastHandledDate?.getTime() || 0);

         if (isFresh) {
            vacancies.push(job);
         }

         return isFresh;
      });

      break;
   }

   return vacancies;
}

export { parseJustJoinIt };
