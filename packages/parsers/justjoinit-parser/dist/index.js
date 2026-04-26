const url_d = 'https://justjoin.it/api/candidate-api/offers?from=0&itemsCount=100&categories=javascript&cityRadius=30&currency=pln&orderBy=descending&sortBy=publishedAt&keywordType=skill&isPromoted=true';
const semanticTechSheet = [
    { react: ['javascript'] },
    {
        'next.js': ['javascript', 'react'],
    },
    { angular: ['javascript'] },
];
const normilizeTechs = (techs) => {
    const normilizedTechsStack = new Set();
    for (const tech of techs) {
        const semanticEdge = semanticTechSheet.find((i) => tech in i);
        if (semanticEdge) {
            const deps = semanticEdge[tech];
            deps.forEach((d) => normilizedTechsStack.add(d));
        }
        normilizedTechsStack.add(tech);
    }
    return [...normilizedTechsStack];
};
const normilizeOptions = ({ tech, language, ...rest }) => {
    const normilizedTechOptions = normilizeTechs([tech, language]);
    const restOptions = Object.values(rest);
    return [...normilizedTechOptions, ...restOptions];
};
const assembleUrl = ({ categories, keywords, experienceLevel, }) => {
    const url = new URL('/api/candidate-api/offers', 'https://justjoin.it');
    if (categories) {
        url.searchParams.set('categories', categories);
    }
    if (keywords) {
        url.searchParams.set('keywords', keywords.charAt(0).toUpperCase() + keywords.slice(1));
    }
    if (experienceLevel) {
        url.searchParams.set('experienceLevels', experienceLevel);
    }
    url.searchParams.set('cityRadius', '30');
    url.searchParams.set('keywordType', 'skill');
    url.searchParams.set('currency', 'pln');
    return url;
};
const createCursorsRegistry = () => {
    return new Map();
};
const setRecord = (filter, cursor, cursorRegistry) => {
    const filterOptions = normilizeOptions(filter);
    let compatibleKey = null;
    cursorRegistry.forEach((v, k, m) => {
        if (k.length !== filterOptions.length)
            return;
        const compatible = k.every((i) => filterOptions.includes(i));
        if (compatible) {
            compatibleKey = k;
        }
    });
    if (compatibleKey) {
        cursorRegistry.set(compatibleKey, cursor);
    }
    else {
        cursorRegistry.set(filterOptions, cursor);
    }
};
const getBestCursor = (filter, cursorRegistry) => {
    const filterOptions = normilizeOptions(filter);
    const compatibleCursors = [];
    cursorRegistry.forEach((v, k, m) => {
        if (k.length > filterOptions.length)
            return;
        const compatible = k.every((option) => filterOptions.includes(option));
        if (compatible) {
            compatibleCursors.push(v);
        }
    });
    const bestCursor = compatibleCursors.reduce((a, b) => (a > b ? a : b), new Date(0));
    return bestCursor;
};
const experienceLevelMap = {
    intern: 'junior',
    junior: 'junior',
    middle: 'mid',
    senior: 'senior',
};
async function parseJustJoinIt(options, cursor) {
    const vacancies = [];
    const url = assembleUrl({
        categories: options.language,
        keywords: options.tech,
        experienceLevel: experienceLevelMap[options.level],
    });
    const response = await fetch(url);
    const json = await response.json();
    const jobs = json.data;
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
