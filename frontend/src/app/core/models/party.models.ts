export interface PartyConfig {
  nomeCrianca: string;
  slug?: string;
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
  caixa18Anos?: Caixa18AnosConfig;
  prazoConfirmacao?: string | null;
  confirmacaoLiberada?: boolean;
  confirmacaoAberta?: boolean;
}

export interface Caixa18AnosConfig {
  titulo?: string;
  texto?: string;
  qrCodeUrl?: string;
  pixKey?: string;
}

export interface RsvpPublicResponse {
  nome: string;
  quantidadeAdultos: number;
  quantidadeCriancas: number;
  nomesAdultos: string[];
  nomesCriancas: string[];
  idadesCriancas: number[];
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
  /** Idade em anos de cada criança (alinhada a nomesCriancas). */
  idadesCriancas?: number[];
}

export interface RsvpResponse {
  id: number;
  nome: string;
  quantidadeAdultos: number;
  quantidadeCriancas: number;
  telefone: string | null;
  nomesAdultos: string[];
  nomesCriancas: string[];
  idadesCriancas: number[];
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

export type FotoDestinos = 'MURAL' | 'STORY' | 'AMBOS';
export type FotoStatus = 'PENDENTE' | 'APROVADA' | 'REJEITADA';
export type FotoDestino = 'MURAL' | 'STORY';

export interface Foto {
  id: number;
  nomeArquivo: string;
  url: string;
  aprovada: boolean;
  createdAt: string;
  tipo: FotoDestino;
  mimeType: string | null;
  expiresAt: string | null;
  video: boolean;
  status?: FotoStatus;
  destinosSolicitados?: FotoDestinos;
  destinos?: FotoDestino[];
}

export interface FotoPage {
  items: Foto[];
  page: number;
  size: number;
  total: number;
  hasMore: boolean;
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
  storiesAtivos?: number;
  muralCount?: number;
}

export interface RsvpConfig {
  confirmacaoLiberada: boolean;
  prazoConfirmacao: string | null;
  confirmacaoAberta: boolean;
}
