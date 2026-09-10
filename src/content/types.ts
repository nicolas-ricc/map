import type { ZoneId } from "../map/zones";

export interface LinkItem { label: string; url: string }
export interface ContentItem { titulo: string; descripcion?: string; links: LinkItem[] }
export interface ContentSection { subtitulo: string; items: ContentItem[] }
export interface ZoneContent {
  id: ZoneId;
  titulo: string;
  descripcion?: string;
  pdf?: string;
  secciones: ContentSection[];
}
export interface FeedItem { title: string; url: string; date: string }
