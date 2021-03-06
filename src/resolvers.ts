// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { QueryResolverFn,
         PreparedCondition,
         ResolverContext }      from './types';
import { dummyTargetObject,
         isUnsafeVarNames}      from './lib/protection';
import { getObjectValue,
         getTrueCaseFieldName, 
         isEqualComplexName }   from './lib/util';
import { parse as parseCsv }    from './lib/csv-parser';
import { sortRecords }          from './sort';
import { applyWhereConditions } from './filters';



export interface StaticResolverConfig {
    noCache?: boolean;
    noFiltering?: boolean;
    noSorting?: boolean;
}

// const defaultStaticResolverConfig: StaticResolverConfig = {
//     noCache: true,
//     noFiltering: true,
//     noSorting: true,
// };
const defaultStaticResolverConfig: StaticResolverConfig = {
    noCache: false,
    noFiltering: false,
    noSorting: false,
};


export function setDefaultStaticResolverConfig(conf: StaticResolverConfig): void {
    Object.assign(defaultStaticResolverConfig, conf);
}


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

    for (let c = 0; c < header.length; c++) {
        if (isUnsafeVarNames(dummyTargetObject, header[c])) {
            throw new Error(`Unsafe symbol name is appeared: ${header[c]}`);
        }
    }

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


function passThroughParser(src: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return src;
}


function filterAndSliceRecords(
        fromCache: boolean,
        records: any[], fields: string[], conditions: PreparedCondition[],
        limit: number | null, offset: number | null, ctx: ResolverContext,
        config: StaticResolverConfig) {

    if (! records.length) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return records;
    }

    const removingFields = new Set<string>();
    const recordFields = new Map<string, string>(Object.keys(records[0]).map(x => [x.toLowerCase(), x]));
    const requestedFields = new Set<string>(fields.map(x => x.toLowerCase()));

    for (const field of requestedFields.keys()) {
        if (! recordFields.has(field)) {
            throw new Error(`Field "${field}" is not supplied from resolver "${ctx.resolverName}".`);
        }
    }

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

    if (! config.noFiltering) {
        records = applyWhereConditions(ctx, conditions, records);
        ctx.resolverCapabilities.filtering = true;
    }
    if (fromCache) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        records = records.map(x => ({...x}))
    }
    if (config.noFiltering) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return records;
    }

    if (!config.noSorting && ctx.query && ctx.query.orderBy) {
        const primaryPathLen = ctx.query.from[0].name.length;
        if (ctx.graphPath.length === primaryPathLen && isEqualComplexName(ctx.graphPath, ctx.query.from[0].name)) {
            if (ctx.query.orderBy.every(w => w.name.length === primaryPathLen + 1 &&
                recordFields.has(w.name[w.name.length - 1].toLowerCase()))) {

                records = sortRecords(ctx.query, records);
                ctx.resolverCapabilities.sorting = true;
            }
        }
    }

    for (const field of recordFields.keys()) {
        if (! requestedFields.has(field)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            removingFields.add(recordFields.get(field)!);
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


function staticResolverBuilderGen<T>(parser: (s: T) => any[]):
        (resolverName: string, fetcher: () => Promise<T>, config: StaticResolverConfig) => QueryResolverFn {

    return (resolverName, fetcher, config) => {
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
                if (! config.noCache) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    ctx.resolverData.cache = cache;
                }
            }

            let fromCache = false;
            let records: any[] | null = null;
            if (cachedRecords === null) {
                const fetched = await fetcher();
                records = parser(fetched);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-return
                cache!.set(resolverName, records.map(x => ({...x})));
            } else {
                fromCache = true;
                records = cachedRecords;
            }

            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return filterAndSliceRecords(fromCache, records, fields, conditions, limit, offset, ctx, config);
        };
    }
}


export const staticJsonResolverBuilder:
        (resolverName: string, fetcher: () => Promise<string>, config?: StaticResolverConfig) => QueryResolverFn =
    (resolverName, fetcher, config) => {
        return staticResolverBuilderGen(jsonRecordsParser)(resolverName, fetcher, config ?? defaultStaticResolverConfig);
    };


export const staticCsvResolverBuilder:
        (resolverName: string, fetcher: () => Promise<string>, config?: StaticResolverConfig) => QueryResolverFn =
    (resolverName, fetcher, config) => {
        return staticResolverBuilderGen(csvRecordsParser)(resolverName, fetcher, config ?? defaultStaticResolverConfig);
    };


export const passThroughResolverBuilder:
        (resolverName: string, fetcher: () => Promise<any[]>, config?: StaticResolverConfig) => QueryResolverFn =
    (resolverName, fetcher, config) => {
        return staticResolverBuilderGen(passThroughParser)(resolverName, fetcher, config ?? defaultStaticResolverConfig);
    };
