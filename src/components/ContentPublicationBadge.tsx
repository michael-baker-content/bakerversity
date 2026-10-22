export default function ContentPublicationBadge({published,updated=false}:{published:boolean;updated?:boolean}){
 if(published&&!updated)return null
 return <span title={published?'Saved changes have not been published yet.':'This item is not published.'} style={{fontSize:11,fontWeight:600,padding:'1px 7px',borderRadius:'var(--radius-full)',background:published?'var(--amber-muted)':'var(--surface-2)',color:published?'var(--amber-ink)':'var(--text-3)',flexShrink:0}}>{published?'Updated':'Draft'}</span>
}
