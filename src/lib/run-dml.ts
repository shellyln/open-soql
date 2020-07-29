// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { PreparedQuery,
         PreparedResolver,
         PreparedSubQuery,
         PreparedCondition,
         PreparedOrderByField,
         ResolverContext,
         ResolverEvent,
         InsertResolverFn,
         UpdateResolverFn,
         RemoveResolverFn,
         QueryBuilderInfoInternal } from '../types';



export async function executeInsertDML(
        builder: QueryBuilderInfoInternal,
        resolverName: string,
        records: any[]
        ): Promise<any[]> {

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const resolvers = builder.resolvers.insert!;
    let resolverInfo: InsertResolverFn | null = null;
    for (const key of Object.keys(resolvers)) {
        if (key.toLowerCase() === resolverName.toLowerCase()) {
            resolverInfo = resolvers[key];
        }
    }
    if (! resolverInfo) {
        throw new Error(`Resolver name ${resolverName} is not resolved.`);
    }

    const evt: ResolverEvent = {
        resolverData: {},
    };

    if (builder.events.beginExecute) {
        const z = await builder.events.beginExecute(evt);
    }

    const ctx = {
        functions: builder.functions,
        graphPath: [],
        resolverName: resolverName,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        resolverData: evt.resolverData,
    };

    const ret = await resolverInfo(records, ctx);

    if (builder.events.endExecute) {
        const z = await builder.events.endExecute(evt);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return ret;
}


export async function executeUpdateDML(
        builder: QueryBuilderInfoInternal,
        resolverName: string,
        records: any[]
        ): Promise<any[]> {

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const resolvers = builder.resolvers.update!;
    let resolverInfo: UpdateResolverFn | null = null;
    for (const key of Object.keys(resolvers)) {
        if (key.toLowerCase() === resolverName.toLowerCase()) {
            resolverInfo = resolvers[key];
        }
    }
    if (! resolverInfo) {
        throw new Error(`Resolver name ${resolverName} is not resolved.`);
    }

    const evt: ResolverEvent = {
        resolverData: {},
    };

    if (builder.events.beginExecute) {
        const z = await builder.events.beginExecute(evt);
    }

    const ctx = {
        functions: builder.functions,
        graphPath: [],
        resolverName: resolverName,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        resolverData: evt.resolverData,
    };

    const ret = await resolverInfo(records, ctx);

    if (builder.events.endExecute) {
        const z = await builder.events.endExecute(evt);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return ret;
}


export async function executeRemoveDML(
        builder: QueryBuilderInfoInternal,
        resolverName: string,
        records: any[]
        ): Promise<void> {

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const resolvers = builder.resolvers.remove!;
    let resolverInfo: RemoveResolverFn | null = null;
    for (const key of Object.keys(resolvers)) {
        if (key.toLowerCase() === resolverName.toLowerCase()) {
            resolverInfo = resolvers[key];
        }
    }
    if (! resolverInfo) {
        throw new Error(`Resolver name ${resolverName} is not resolved.`);
    }

    const evt: ResolverEvent = {
        resolverData: {},
    };

    if (builder.events.beginExecute) {
        const z = await builder.events.beginExecute(evt);
    }

    const ctx = {
        functions: builder.functions,
        graphPath: [],
        resolverName: resolverName,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        resolverData: evt.resolverData,
    };

    const ret = await resolverInfo(records, ctx);

    if (builder.events.endExecute) {
        const z = await builder.events.endExecute(evt);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return ret;
}
