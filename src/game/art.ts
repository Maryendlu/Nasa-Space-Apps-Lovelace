import andreas from "@/assets/mars/andreas.png.asset.json";
import laika from "@/assets/mars/laika.png.asset.json";
import lina from "@/assets/mars/lina.png.asset.json";
import maya from "@/assets/mars/maya.png.asset.json";
import milo from "@/assets/mars/milo.png.asset.json";
import mayaSprites from "@/assets/mars/maya-directional.png.asset.json";
import miloSprites from "@/assets/mars/milo-directional.png.asset.json";
import scene from "@/assets/mars/base-scene.jpg.asset.json";
import reference from "@/assets/mars/reference-scene.jpg.asset.json";
import cabin from "@/assets/mars/official-cabin.jpeg.asset.json";
import world from "@/assets/mars/official-world.png.asset.json";
import cutscene from "@/assets/mars/arrival-cutscene.mp4.asset.json";
import englishCutscene from "@/assets/mars/arrival-english.mp4.asset.json";
import energyRoom from "@/assets/mars/missions/sala_de_energia.jpeg.asset.json";
import equipmentRoom from "@/assets/mars/missions/sala_de_equipamentos.jpeg.asset.json";
import lifeSupport from "@/assets/mars/missions/laboratorio_de_suporte_a_vida.jpeg.asset.json";
import communication from "@/assets/mars/missions/estacao_de_comunicacao.jpeg.asset.json";
import analysis from "@/assets/mars/missions/laboratorio_de_analises.jpeg.asset.json";
import navigation from "@/assets/mars/missions/sala_de_navegacao.jpeg.asset.json";
import waterTreatment from "@/assets/mars/missions/sala_de_tratamento_de_agua.jpeg.asset.json";
import exploration from "@/assets/mars/missions/area_de_exploracao.jpeg.asset.json";
import outdoors from "@/assets/mars/missions/area_externa.jpeg.asset.json";
import teamLogo from "@/assets/mars/team-logo.png.asset.json";
export const logoUrl = teamLogo.url;
export const portraits: Record<string, string> = {
  andreas: andreas.url,
  laika: laika.url,
  lina: lina.url,
  maya: maya.url,
  milo: milo.url,
};
export const sprites: Record<string, string> = { maya: mayaSprites.url, milo: miloSprites.url };
export const sceneUrl = scene.url;
export const referenceUrl = reference.url;
export const cabinUrl = cabin.url;
export const worldUrl = world.url;
export const cutsceneUrl = cutscene.url;
export function cutsceneForLanguage(language: "en" | "pt"): string {
  return language === "en" ? englishCutscene.url : cutsceneUrl;
}
export const missionScenes: Record<string, string> = {
  wires: energyRoom.url,
  code: lifeSupport.url,
  antenna: communication.url,
  solar: outdoors.url,
  rock: exploration.url,
  water: waterTreatment.url,
  route: navigation.url,
  suit: equipmentRoom.url,
  samples: analysis.url,
};
import homeVideo from "@/assets/mars/home-background.mp4.asset.json";
import creditsHorizon from "@/assets/mars/credits-horizon.png.asset.json";
import homeMusic from "@/assets/mars/music/tela_inicial.mp3.asset.json";
import mainMusic from "@/assets/mars/music/principal_durante_o_jogo.mp3.asset.json";
import finalMusic from "@/assets/mars/music/tela_final.mp3.asset.json";
import emergencyMusic from "@/assets/mars/music/emergencia.mp3.asset.json";
import interruptedMusic from "@/assets/mars/music/missao_interrompida.mp3.asset.json";
export const homeVideoUrl = homeVideo.url;
export const creditsBackgroundUrl = creditsHorizon.url;
export const musicTracks = {
  home: homeMusic.url,
  main: mainMusic.url,
  final: finalMusic.url,
  emergency: emergencyMusic.url,
  interrupted: interruptedMusic.url,
} as const;
