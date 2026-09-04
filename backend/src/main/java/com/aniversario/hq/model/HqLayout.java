package com.aniversario.hq.model;

public enum HqLayout {
    FULL,
    DUPLO,
    TRIPLO;

    public int painelCount() {
        return switch (this) {
            case FULL -> 1;
            case DUPLO -> 2;
            case TRIPLO -> 3;
        };
    }
}
