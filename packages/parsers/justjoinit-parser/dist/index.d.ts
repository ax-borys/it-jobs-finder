type Cursor<T> = {
    ctx: T;
};
type Vacancy = {
    publishedAt: string;
};
declare function parseJustJoinIt(c?: Cursor<{
    lastHandledDate: Date;
}>): Promise<Vacancy[]>;
export { parseJustJoinIt };
