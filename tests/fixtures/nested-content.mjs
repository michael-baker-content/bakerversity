const paragraph=text=>({type:'paragraph',content:[{type:'text',text}]})
const quiz=title=>({type:'practiceQuiz',attrs:{title,questions:[{id:'shared-id',question_type:'multiple_choice',question_text:'Choose yes',options:['Yes','No'],correct_answer:'0'}]}})
export const nestedContent={type:'doc',content:[
 paragraph('Before nested content'),
 {type:'callout',attrs:{type:'note'},content:[paragraph('Inside callout'),quiz('First quiz'),
 {type:'bulletList',content:[{type:'listItem',content:[paragraph('List content'),quiz('Second quiz')]}]}]},
 {type:'table',content:[{type:'tableRow',content:[{type:'tableCell',content:[paragraph('Graph cell'),{type:'mafsGraph',attrs:{functions:[],xMin:-5,xMax:5,yMin:-5,yMax:5,showGrid:true,label:'Nested graph'}}]}]}]},
 {type:'directoryTree',attrs:{source:'root/\n└── file.txt',title:'Files'}},
 {type:'slideshow',attrs:{id:'fixture',title:'Slideshow fixture'},content:[1,2].map(n=>({type:'slideshowSlide',content:[{type:'image',attrs:{src:'/fixture-slide-'+n+'.png',alt:'Slide image '+n}},{type:'slideshowDescription',content:[paragraph('Slide description '+n),{type:'paragraph',content:[{type:'inlineMath',attrs:{latex:'x^2'}}]}]}]}))},
 paragraph('After nested content')
]}
