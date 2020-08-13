// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { StaticResolverConfig } from '../../resolvers';



export const noCapsStaticResolverConfig: StaticResolverConfig = {
    noCache: true,
    noFiltering: true,
    noSorting: true,
};

export const normalStaticResolverConfig: StaticResolverConfig = {
    noCache: false,
    noFiltering: false,
    noSorting: false,
};

export const resolverConfigs = [
    noCapsStaticResolverConfig,
    normalStaticResolverConfig,
];
