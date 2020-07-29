// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { PreparedQuery,
         PreparedResolver,
         PreparedSubQuery,
         PreparedCondition,
         PreparedOrderByField,
         ResolverContext,
         QueryBuilderInfoInternal }    from '../types';



export async function executeCreateDML(
        builder: QueryBuilderInfoInternal,
        resolverName: string,
        records: any[]
        ): Promise<any[]> {

    return Promise.resolve([]);
}


export async function executeUpdateDML(
        builder: QueryBuilderInfoInternal,
        resolverName: string,
        records: any[]
        ): Promise<any[]> {

    return Promise.resolve([]);
}


export async function executeRemoveDML(
        builder: QueryBuilderInfoInternal,
        resolverName: string,
        records: any[]
        ): Promise<void> {

    return Promise.resolve();
}
