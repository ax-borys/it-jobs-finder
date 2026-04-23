const url = "https://justjoin.it/api/candidate-api/offers?from=0&itemsCount=100&categories=javascript&cityRadius=30&currency=pln&orderBy=descending&sortBy=publishedAt&keywordType=any&isPromoted=true";
async function parseJustJoinIt() {
    const response = await fetch(url);
    const json = await response.json();
    const jobs = json.data;
    return jobs;
}
export { parseJustJoinIt };
