// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { QueryResolverFn,
         PreparedCondition,
         ResolverContext }      from './types';
import { getObjectValue,
         getTrueCaseFieldName } from './lib/util';
import { parse as parseCsv }    from './lib/csv-parser';
import { sortRecords }          from './sort';
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


function filterAndSliceRecords(
        records: any[], fields: string[], conditions: PreparedCondition[],
        limit: number | null, offset: number | null, ctx: ResolverContext) {

    ctx.resolverCapabilities.filtering = true;

    if (! records.length) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return records;
    }

    const removingFields = new Set<string>();
    const recordFields = new Map<string, string>(Object.keys(records[0]).map(x => [x.toLowerCase(), x]));
    const requestedFields = new Set<string>(fields.map(x => x.toLowerCase()));

    for (const field of requestedFields.keys()) {
        if (! recordFields.has(field)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            throw new Error(`Field "${field}" is not supplied from resolver "${ctx.resolverName}".`);
        }
    }
    for (const field of recordFields.keys()) {
        if (! requestedFields.has(field)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            removingFields.add(recordFields.get(field)!);
        }
    }

    records = applyWhereConditions(ctx, conditions, records);

    if (records.length && ctx.parent) {
        switch (ctx.parentType) {
        case 'master':
            if (ctx.foreignIdField) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion
                const parentId = getObjectValue(ctx.parent, ctx.masterIdField!);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const fName = getTrueCaseFieldName(records[0], ctx.foreignIdField!);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion
                records = records.filter(x => x[fName!] === parentId);
            }
            break;
        case 'detail':
            if (ctx.foreignIdField) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion
                const parentId = getObjectValue(ctx.parent, ctx.foreignIdField!);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const fName = getTrueCaseFieldName(records[0], ctx.masterIdField!);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion
                records = records.filter(x => x[fName!] === parentId);
            }
            break;
        }
    }

    if (ctx.query && ctx.query.orderBy) {
        const primaryPathLen = ctx.query.from[0].name.length;

        if (ctx.query.orderBy.every(w => w.name.length === primaryPathLen + 1)) {
            records = sortRecords(ctx.query, records);
            ctx.resolverCapabilities.sorting = true;
        }
    }

    for (const record of records) {
        for (const field of removingFields) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            delete record[field];
        }
    }

    if (ctx.resolverCapabilities.sorting) {
        if (typeof offset === 'number') {
            records = records.slice(offset);
        }
        if (typeof limit === 'number') {
            records = records.slice(0, limit);
        }
        ctx.resolverCapabilities.limit = true;
        ctx.resolverCapabilities.offset = true;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return records;
}


const StaticResolverBuilderGen:
        (parser: (s: string) => any[]) =>
            (resolverName: string, fetcher: () => Promise<string>) => QueryResolverFn =
    (parser) => {
        return (resolverName, fetcher) => {

            return async (fields, conditions, limit, offset, ctx) => {
                let cache: Map<string, string> | null;
                let src: string | null = null;

                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                if (ctx.resolverData.cache) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                    cache = ctx.resolverData.cache;
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    if (cache!.has(resolverName)) {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        src = cache!.get(resolverName)!;
                    }
                } else {
                    cache = new Map<string, string>();
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    ctx.resolverData.cache = cache;
                }

                let records: any[] | null = null;
                if (src === null) {
                    const fetched = await fetcher();
                    records = parser(fetched);
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    cache!.set(resolverName, fetched);
                } else {
                    records = parser(src);
                }

                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return filterAndSliceRecords(records, fields, conditions, limit, offset, ctx);
            };
        }
    };


export const staticJsonResolverBuilder:
        (resolverName: string, fetcher: () => Promise<string>) => QueryResolverFn =
    (resolverName, fetcher) => {
        return StaticResolverBuilderGen(jsonRecordsParser)(resolverName, fetcher);
    };


export const staticCsvResolverBuilder:
        (resolverName: string, fetcher: () => Promise<string>) => QueryResolverFn =
    (resolverName, fetcher) => {
        return StaticResolverBuilderGen(csvRecordsParser)(resolverName, fetcher);
    };


export const passThroughResolverBuilder:
        (resolverName: string, fetcher: () => Promise<any[]>) => QueryResolverFn =
    (resolverName, fetcher) => {
        return async (fields, conditions, limit, offset, ctx) => {
            let cache: Map<string, any[]> | null;
            let cachedRecords: any[] | null = null;

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (ctx.resolverData.cache) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                cache = ctx.resolverData.cache;
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                if (cache!.has(resolverName)) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    cachedRecords = cache!.get(resolverName)!;
                }
            } else {
                cache = new Map<string, any[]>();
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                ctx.resolverData.cache = cache;
            }

            let records: any[] | null = null;
            if (cachedRecords === null) {
                records = (await fetcher());
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-return
                cache!.set(resolverName, records.map(x => ({...x})));
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                records = cachedRecords.map(x => ({...x}));
            }

            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return filterAndSliceRecords(records, fields, conditions, limit, offset, ctx);
        };
    };
