export interface ImportMetadata {title?:string;introduction?:string;estimated_minutes?:number;activity_type?:string;is_required?:boolean}
export function importedLearningSettings(value:ImportMetadata){
 return {...(value.estimated_minutes!==undefined?{estimated_minutes:value.estimated_minutes}:{}),...(value.activity_type!==undefined?{activity_type:value.activity_type}:{}),...(value.is_required!==undefined?{is_required:value.is_required}:{})}
}
