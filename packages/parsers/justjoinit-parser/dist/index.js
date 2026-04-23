const url = 'https://justjoin.it/api/candidate-api/offers?from=0&itemsCount=100&categories=javascript&cityRadius=30&currency=pln&orderBy=descending&sortBy=publishedAt&keywordType=any&isPromoted=true';
async function parseJustJoinIt(c) {
    const lastHandledDate = c?.ctx.lastHandledDate;
    const vacancies = [];
    while (true) {
        const response = await fetch(url);
        const json = await response.json();
        const jobs = json.data;
        jobs.every((job) => {
            const publishedAt = new Date(job.publishedAt);
            const isFresh = publishedAt.getTime() > (lastHandledDate?.getTime() || 0);
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
