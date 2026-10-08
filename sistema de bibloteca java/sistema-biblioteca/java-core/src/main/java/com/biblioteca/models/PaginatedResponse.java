package com.biblioteca.models;

import java.util.Collections;
import java.util.List;

public class PaginatedResponse<T> {
    private List<T> items;
    private long total;
    private int page;
    private int limit;
    private int totalPages;

    public PaginatedResponse() {
        this.items = Collections.emptyList();
    }

    public PaginatedResponse(List<T> items, long total, int page, int limit) {
        this.items = items != null ? items : Collections.emptyList();
        this.total = total;
        this.page = page > 0 ? page : 1;
        this.limit = limit > 0 ? limit : 25;
        this.totalPages = (int) Math.ceil((double) total / this.limit);
        if (this.totalPages == 0 && total == 0) {
            this.totalPages = 0;
        }
    }

    public List<T> getItems() {
        return items;
    }

    public void setItems(List<T> items) {
        this.items = items;
    }

    public long getTotal() {
        return total;
    }

    public void setTotal(long total) {
        this.total = total;
    }

    public int getPage() {
        return page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getLimit() {
        return limit;
    }

    public void setLimit(int limit) {
        this.limit = limit;
    }

    public int getTotalPages() {
        return totalPages;
    }

    public void setTotalPages(int totalPages) {
        this.totalPages = totalPages;
    }
}
