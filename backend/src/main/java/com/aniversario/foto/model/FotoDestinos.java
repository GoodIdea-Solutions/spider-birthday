package com.aniversario.foto.model;

public enum FotoDestinos {
    MURAL,
    STORY,
    AMBOS;

    public boolean incluiMural() {
        return this != STORY;
    }

    public boolean incluiStory() {
        return this != MURAL;
    }

    public static FotoDestinos fromLegado(FotoTipo tipo) {
        return tipo == FotoTipo.STORY ? STORY : MURAL;
    }
}
