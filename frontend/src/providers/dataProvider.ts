import type { CrudFilter, DataProvider } from '@refinedev/core';
import { API_URL, httpClient } from './axios';

function applyFilters(params: Record<string, unknown>, filters?: CrudFilter[]) {
  if (!filters) {
    return;
  }
  for (const f of filters) {
    if (!('field' in f)) {
      continue;
    }
    if (f.value === undefined || f.value === null || f.value === '') {
      continue;
    }
    // "contains" on the special `q` field drives global/table search.
    if (f.field === 'q' || f.operator === 'contains') {
      params[f.field === 'q' ? 'q' : f.field] = f.value;
    } else {
      params[f.field] = f.value;
    }
  }
}

/** Custom data provider for the NewVision NestJS API ({ data, total } list shape). */
export const dataProvider: DataProvider = {
  getApiUrl: () => API_URL,

  getList: async ({ resource, pagination, sorters, filters }) => {
    const current = pagination?.currentPage ?? 1;
    const pageSize = pagination?.pageSize ?? 25;
    const params: Record<string, unknown> = {
      _start: (current - 1) * pageSize,
      _end: current * pageSize,
    };
    const sorter = sorters?.[0];
    if (sorter) {
      params._sort = sorter.field;
      params._order = sorter.order;
    }
    applyFilters(params, filters);

    const { data } = await httpClient.get(`/${resource}`, { params });
    return { data: data.data ?? data, total: data.total ?? (data.data ?? data).length };
  },

  getOne: async ({ resource, id }) => {
    const { data } = await httpClient.get(`/${resource}/${id}`);
    return { data };
  },

  getMany: async ({ resource, ids }) => {
    const results = await Promise.all(
      ids.map((id) => httpClient.get(`/${resource}/${id}`).then((r) => r.data)),
    );
    return { data: results };
  },

  create: async ({ resource, variables }) => {
    const { data } = await httpClient.post(`/${resource}`, variables);
    return { data };
  },

  update: async ({ resource, id, variables }) => {
    const { data } = await httpClient.put(`/${resource}/${id}`, variables);
    return { data };
  },

  deleteOne: async ({ resource, id }) => {
    const { data } = await httpClient.delete(`/${resource}/${id}`);
    return { data };
  },

  custom: async ({ url, method, payload, query, headers }) => {
    const { data } = await httpClient.request({
      url: url.startsWith('http') ? url : `/${url.replace(/^\//, '')}`,
      method: method ?? 'get',
      data: payload,
      params: query,
      headers,
    });
    return { data };
  },
};
