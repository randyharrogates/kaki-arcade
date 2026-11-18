// RZ-003 / RZ-005: deterministic presentation fixture; never imported by production.
import { createElement as h, render } from 'preact';
import { ControllerShell, LayoutEngine } from '../../../packages/controller-kit/src/index.ts';
import '../../../packages/ui/tokens.css';
import '../../../packages/controller-kit/src/shell.css';
import '../../../packages/controller-kit/src/layout.css';
import '../controller.css';
import { rabakz, questionData, QUESTION_DATA } from '../src/index.ts';
import { controllerLayout, privateView } from '../src/rules/views.ts';
const labels = [
  'Another long reply with forty characters',
  'These words fill the last lengthy option',
  'A lovely hot bowl of noodles with prawns',
  'The top place to meet friends for dinner',
];
const leader = new URLSearchParams(location.search).get('leader') === '1';
const initial = rabakz.init(42,[{id:'one',name:'Player 1',seat:1,colour:'seat-1'}],{length:10,difficulty:'mixed'}, {
  saved: null, teams: false, data: { [QUESTION_DATA]: questionData(Array.from({length:10},(_,i) => ({
    id:String(i),prompt:'Four longest allowed options',options:labels,correct:0,
    category:'General',difficulty:'easy',type:'multiple-choice',region:'general',
  }))) },
});
const player = initial.players[0];
if (!player) throw new Error('Missing fixture player');
const scenario = new URLSearchParams(location.search).get('state');
const state = scenario === 'scoreboard' || scenario === 'over' ? { ...initial,phase:scenario,players:[
  {...player,score:700}, {...player,info:{...player.info,id:'two'},score:800},
] } : scenario === 'waiting' ? {...initial,players:initial.players.map(p => ({...p,eligible:false}))} : initial;
const app = document.querySelector('#app');
if (!app) throw new Error('Missing fixture app');
render(h(ControllerShell,{seat:1,name:leader ? 'Leader' : 'Guest',link:'connected',theme:'rabakz'},h('div',{id:'layout',style:{height:'100%'}})),app);
const root = document.querySelector('#layout');
if (!root) throw new Error('Missing fixture layout');
const play = root.closest('.ka-controller-play');
if (!(play instanceof HTMLElement)) throw new Error('Missing fixture play area');
const draw = () => {
  const area = {width:play.clientWidth,height:play.clientHeight};
  render(h(LayoutEngine,{layout:controllerLayout(state,'one'),privateView:privateView(state,'one'),area,
    viewport:{width:innerWidth,height:innerHeight},isLeader:leader,onOutput:()=>{ /* presentation only */ }}),root);
};
new ResizeObserver(draw).observe(play); draw();
document.documentElement.dataset.rzReady = '1';
