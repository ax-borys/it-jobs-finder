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
declare const normilizeOptions: ({ tech, language, ...rest }: Filter) => FilterOption[];
type NormalizedOptions = ReturnType<typeof normilizeOptions>;
type CursorRegistry = Map<NormalizedOptions, Cursor<Date>>;
declare const createCursorsRegistry: () => CursorRegistry;
declare const setRecord: (filter: Filter, cursor: Cursor<Date>, cursorRegistry: CursorRegistry) => void;
declare const getBestCursor: (filter: Filter, cursorRegistry: CursorRegistry) => Cursor<Date>;
declare function parseJustJoinIt(options: Filter, cursor: Cursor<Date>): Promise<{
    data: Vacancy[];
    cursor: Cursor<Date>;
}>;
export { parseJustJoinIt, setRecord, getBestCursor, createCursorsRegistry };
export type { Filter };
