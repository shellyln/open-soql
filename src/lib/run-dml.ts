// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { ResolverEvent,
         InsertResolverFn,
         UpdateResolverFn,
         RemoveResolverFn,
         QueryBuilderInfoInternal } from '../types';



export async function executeInsertDML(
        builder: QueryBuilderInfoInternal,
        // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
        tr: any,
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        transactionData: tr,
    };

    if (builder.events.beginExecute) {
        await builder.events.beginExecute(evt);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let ret: any [] = null as any;

    try {
        const ctx = {
            functions: builder.functions,
            graphPath: [],
            resolverName: resolverName,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            resolverData: evt.resolverData,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            transactionData: tr,
            resolverCapabilities: {
                filtering: false,
            },
        };

        ret = await resolverInfo(records, ctx);

        if (builder.events.endExecute) {
            await builder.events.endExecute(evt, null);
        }
    } catch(e) {
        if (builder.events.endExecute) {
            await builder.events.endExecute(evt, e);
        }

        throw e;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return ret;
}


export async function executeUpdateDML(
        builder: QueryBuilderInfoInternal,
        // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
        tr: any,
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        transactionData: tr,
    };

    if (builder.events.beginExecute) {
        await builder.events.beginExecute(evt);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let ret: any [] = null as any;

    try {
        const ctx = {
            functions: builder.functions,
            graphPath: [],
            resolverName: resolverName,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            resolverData: evt.resolverData,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            transactionData: tr,
            resolverCapabilities: {
                filtering: false,
            },
        };

        ret = await resolverInfo(records, ctx);

        if (builder.events.endExecute) {
            await builder.events.endExecute(evt, null);
        }
    } catch(e) {
        if (builder.events.endExecute) {
            await builder.events.endExecute(evt, e);
        }

        throw e;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return ret;
}


export async function executeRemoveDML(
        builder: QueryBuilderInfoInternal,
        // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
        tr: any,
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        transactionData: tr,
    };

    if (builder.events.beginExecute) {
        await builder.events.beginExecute(evt);
    }

    try {
        const ctx = {
            functions: builder.functions,
            graphPath: [],
            resolverName: resolverName,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            resolverData: evt.resolverData,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            transactionData: tr,
            resolverCapabilities: {
                filtering: false,
            },
        };

        await resolverInfo(records, ctx);

        if (builder.events.endExecute) {
            await builder.events.endExecute(evt, null);
        }
    } catch(e) {
        if (builder.events.endExecute) {
            await builder.events.endExecute(evt, e);
        }

        throw e;
    }
}
