export interface PartyConfig {
  nomeCrianca: string;
  idade: string;
  dataFesta: string;
  diaSemana: string;
  horario: string;
  local: string;
  endereco: string;
  linkGoogleMaps: string;
  mensagemHero: string;
  textoApresentacao: string;
  mensagemFaixa: string;
  mensagemPresenca: string;
  mensagemMissao: string;
  whatsappNumber: string;
  emailRecepcao: string;
  instagramHandle: string;
}

export interface RsvpPublicResponse {
  nome: string;
  quantidadeAdultos: number;
  quantidadeCriancas: number;
  nomesAdultos: string[];
  nomesCriancas: string[];
}

export interface RsvpRequest {
  nome: string;
  quantidadeAdultos: number;
  quantidadeCriancas: number;
  telefone?: string | null;
  /** Adultos extras (além do responsável). */
  nomesAdultos?: string[];
  /** Todas as crianças. */
  nomesCriancas?: string[];
}

export interface RsvpResponse {
  id: number;
  nome: string;
  quantidadeAdultos: number;
  quantidadeCriancas: number;
  telefone: string | null;
  nomesAdultos: string[];
  nomesCriancas: string[];
  confirmado: boolean;
  createdAt: string;
}

export interface Presente {
  id: number;
  nome: string;
  descricao: string | null;
  imagemUrl: string | null;
  link: string | null;
  ativo: boolean;
}

export interface Foto {
  id: number;
  nomeArquivo: string;
  url: string;
  aprovada: boolean;
  createdAt: string;
  tipo: 'MURAL' | 'STORY';
  mimeType: string | null;
  expiresAt: string | null;
  video: boolean;
}

export type HqLayout = 'FULL' | 'DUPLO' | 'TRIPLO';

export interface HqPainel {
  id: number;
  fotoId: number;
  fotoUrl: string;
  posicao: number;
  legenda: string | null;
}

export interface HqPagina {
  id: number;
  ordem: number;
  layout: HqLayout;
  titulo: string | null;
  paineis: HqPainel[];
}

export interface HqPainelPayload {
  fotoId: number;
  posicao: number;
  legenda?: string | null;
}

export interface HqPaginaPayload {
  ordem: number;
  layout: HqLayout;
  titulo?: string | null;
  paineis: HqPainelPayload[];
}

export interface Dashboard {
  totalRsvps: number;
  totalAdultos: number;
  totalCriancas: number;
  fotosPendentes: number;
  fotosAprovadas: number;
}
