// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { QueryResolverFn }      from './types';
import { getObjectValue }       from './lib/util';
import { parse as parseCsv }    from './lib/csv-parser';
import { applyWhereConditions } from './filters';



function jsonRecordsParser(src: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const records: any[] = JSON.parse(src);
    if (! Array.isArray(records)) {
        throw new Error(`jsonRecordsParser: Records should be array.`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return records;
}


function csvRecordsParser(src: string) {
    const rawRecords = parseCsv(src.trim());
    if (! rawRecords.length) {
        throw new Error(`csvRecordsParser: Header row is needed.`);
    }
    const header = rawRecords[0];
    const records: any[] = [];
    for (let i = 1; i < rawRecords.length; i++) {
        const cur = rawRecords[i];
        const rec = {};
        for (let c = 0; c < header.length; c++) {
            rec[header[c]] = cur[c];
        }
        records.push(rec);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return records;
}


export const StaticResolverBuilderGen:
        (parser: (s: string) => any[]) =>
            (resolverName: string, fetcher: () => Promise<string>) => QueryResolverFn =

    (parser) => {
        return (resolverName, fetcher) => {

        return async (fields, conditions, limit, offset, ctx) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (ctx.resolverData && ctx.resolverData.cache && ctx.resolverData.cache[resolverName]) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                const cache: Map<string, any[]> = ctx.resolverData.cache[resolverName];
            }

            const src = await fetcher();

            let records: any[] = parser(src);

            if (records.length) {
                const removingFields = new Set<string>();
                const recordFields = new Map<string, string>(Object.keys(records[0]).map(x => [x.toLowerCase(), x]));
                for (const field of fields) {
                    const w = field.toLowerCase();
                    if (! recordFields.has(w)) {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        removingFields.add(recordFields.get(w)!);
                    }
                }
                for (const record of records) {
                    for (const field of removingFields) {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        delete record[field];
                    }
                }
            }
            records = applyWhereConditions(ctx, conditions, records);

            if (ctx.parent) {
                switch (ctx.parentType) {
                case 'master':
                    if (ctx.foreignIdField) {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion
                        const parentId = getObjectValue(ctx.parent, ctx.masterIdField!);
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion
                        records = records.filter(x => getObjectValue(x, ctx.foreignIdField!) === parentId);
                    }
                    break;
                case 'detail':
                    if (ctx.foreignIdField) {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion
                        const parentId = getObjectValue(ctx.parent, ctx.foreignIdField!);
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion
                        records = records.filter(x => getObjectValue(x, ctx.masterIdField!) === parentId);
                    }
                    break;
                }
            }

            if (typeof offset === 'number') {
                records = records.slice(offset);
            }
            if (typeof limit === 'number') {
                records = records.slice(0, limit);
            }

            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return records;
        };
    }
}


export const staticJsonResolverBuilder:
        (resolverName: string, fetcher: () => Promise<string>) => QueryResolverFn =
        (resolverName, fetcher) => {
    return StaticResolverBuilderGen(jsonRecordsParser)(resolverName, fetcher);
}


export const staticCsvResolverBuilder:
        (resolverName: string, fetcher: () => Promise<string>) => QueryResolverFn =
        (resolverName, fetcher) => {
    return StaticResolverBuilderGen(csvRecordsParser)(resolverName, fetcher);
}
