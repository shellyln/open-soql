// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { QueryResolverFn,
         ResolverEvent }        from './types';
import { applyWhereConditions } from './filters';



export const StaticJsonResolverBuilder:
        (resolverName: string, fetcher: () => Promise<string>) => QueryResolverFn =
        (resolverName, fetcher) => {

    return async (fields, conditions, limit, offset, ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (ctx.resolverData && ctx.resolverData.cache && ctx.resolverData.cache[resolverName]) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const cache: Map<string, any[]> = ctx.resolverData.cache[resolverName];
        }

        const src = await fetcher();

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        let records: any[] = JSON.parse(src);
        if (! Array.isArray(records)) {
            throw new Error(`StaticJsonResolver: records should be array.`);
        }

        if (records.length) {
            const removingFields = new Set<string>();
            const recordFields = new Map<string, string>(Object.keys(records[0]).map(x => [x.toLowerCase(), x]));
            for (const field of fields) {
                const w = field.toLowerCase();
                if (recordFields.has(w)) {
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
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                    const parentId = ctx.parent['id'];
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion
                    records = records.filter(x => x[ctx.foreignIdField!] === parentId);
                }
                break;
            case 'detail':
                if (ctx.foreignIdField) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion
                    const parentId = ctx.parent[ctx.foreignIdField!];
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    records = records.filter(x => x['id'] === parentId);
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
