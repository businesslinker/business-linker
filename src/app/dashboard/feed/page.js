'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import Avatar from '../Avatar'
import { Heart, MessageCircle, Image as ImageIcon, Share2, X } from 'lucide-react'

export default function FeedPage() {
  const [userId, setUserId] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [tag, setTag] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [posting, setPosting] = useState(false)
  const [openComments, setOpenComments] = useState({})
  const [commentDraft, setCommentDraft] = useState({})
  const [me, setMe] = useState(null)
  const [filter, setFilter] = useState('all') // 'all' | 'offers'

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id)

    const { data: myProfile } = await supabase.from('profiles').select('full_name, photo_url').eq('id', user.id).single()
    setMe(myProfile)

    const { data } = await supabase
      .from('posts')
      .select(`
        id, content, tag, photo_url, created_at,
        profiles!posts_author_id_fkey ( full_name, photo_url, business_name ),
        post_likes ( member_id ),
        post_comments ( id, content, created_at, profiles!post_comments_author_id_fkey ( full_name ) )
      `)
      .order('created_at', { ascending: false })

    setPosts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function handlePhotoSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function clearPhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  async function submitPost() {
    if (!draft.trim() && !photoFile) return
    setPosting(true)
    const supabase = createClient()

    let photoUrl = null
    if (photoFile) {
      const fileName = `${userId}-${Date.now()}.${photoFile.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage.from('post-photos').upload(fileName, photoFile)
      if (uploadError) {
        alert('Photo upload failed: ' + uploadError.message)
        setPosting(false)
        return
      }
      const { data: urlData } = supabase.storage.from('post-photos').getPublicUrl(fileName)
      photoUrl = urlData.publicUrl
    }

    await supabase.from('posts').insert({ author_id: userId, content: draft, tag: tag ? 'Offer' : null, photo_url: photoUrl })

    setDraft('')
    setTag(false)
    clearPhoto()
    setComposerOpen(false)
    setPosting(false)
    load()
  }

  async function toggleLike(post) {
    const supabase = createClient()
    const likedByMe = post.post_likes.some((l) => l.member_id === userId)
    if (likedByMe) {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('member_id', userId)
    } else {
      await supabase.from('post_likes').insert({ post_id: post.id, member_id: userId })
    }
    load()
  }

  async function addComment(postId) {
    const text = (commentDraft[postId] || '').trim()
    if (!text) return
    const supabase = createClient()
    await supabase.from('post_comments').insert({ post_id: postId, author_id: userId, content: text })
    setCommentDraft((d) => ({ ...d, [postId]: '' }))
    load()
  }

  function sharePost(p) {
    const author = p.profiles?.full_name || 'A member'
    const business = p.profiles?.business_name ? ` (${p.profiles.business_name})` : ''
    const text = `${p.tag ? '🏷️ Offer from ' : 'From '}${author}${business} on Business Linker:\n\n${p.content}`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const filteredPosts = useMemo(() => {
    if (filter === 'offers') return posts.filter((p) => p.tag === 'Offer')
    return posts
  }, [posts, filter])

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading feed...</div>

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-1.5 bg-gray-100 rounded-lg p-1">
        {[['all', 'All Posts'], ['offers', 'Offers Only']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md ${filter === key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={() => setComposerOpen((v) => !v)}
        className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-left bg-white border border-gray-200 text-gray-500"
      >
        <Avatar name={me?.full_name} photoUrl={me?.photo_url} size={28} />
        Share a new offer or update…
      </button>

      {composerOpen && (
        <div className="rounded-xl p-3 space-y-2 bg-white border border-gray-200">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What's new with your business?"
            rows={3}
            className="w-full text-sm resize-none outline-none"
          />

          {photoPreview && (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="" className="rounded-lg max-h-40 object-cover" />
              <button onClick={clearPhoto} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center">
                <X size={13} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
              <ImageIcon size={16} />
              Add Photo
              <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-500">
              <input type="checkbox" checked={tag} onChange={(e) => setTag(e.target.checked)} />
              Mark as an Offer
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => { setComposerOpen(false); clearPhoto() }} className="text-xs px-3 py-1.5 rounded-lg text-gray-500">Cancel</button>
            <button onClick={submitPost} disabled={posting} className="text-xs px-3 py-1.5 rounded-lg font-medium text-white bg-blue-700 disabled:opacity-50">
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      )}

      {filteredPosts.map((p) => {
        const likedByMe = p.post_likes.some((l) => l.member_id === userId)
        return (
          <div key={p.id} className="rounded-xl overflow-hidden bg-white border border-gray-200">
            <div className="p-3.5">
              <div className="flex items-start gap-2.5">
                <Avatar name={p.profiles?.full_name} photoUrl={p.profiles?.photo_url} size={38} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{p.profiles?.full_name}</p>
                    {p.tag && <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{p.tag}</span>}
                  </div>
                  <p className="text-[11px] text-gray-400">{p.profiles?.business_name} · {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
              </div>
              {p.content && <p className="text-sm mt-2.5 leading-relaxed text-gray-800">{p.content}</p>}
            </div>

            {p.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photo_url} alt="" className="w-full max-h-80 object-cover" />
            )}

            <div className="px-3.5 pb-3.5">
              <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-gray-100">
                <button onClick={() => toggleLike(p)} className={`flex items-center gap-1.5 text-xs ${likedByMe ? 'text-rose-600' : 'text-gray-400'}`}>
                  <Heart size={15} fill={likedByMe ? 'currentColor' : 'none'} /> {p.post_likes.length}
                </button>
                <button onClick={() => setOpenComments((o) => ({ ...o, [p.id]: !o[p.id] }))} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <MessageCircle size={15} /> {p.post_comments.length}
                </button>
                <button onClick={() => sharePost(p)} className="flex items-center gap-1.5 text-xs text-gray-400 ml-auto">
                  <Share2 size={15} /> Share
                </button>
              </div>
              {openComments[p.id] && (
                <div className="mt-2.5 pt-2.5 border-t border-gray-100 space-y-2">
                  {p.post_comments.map((c) => (
                    <div key={c.id} className="text-xs">
                      <span className="font-semibold text-gray-800">{c.profiles?.full_name}: </span>
                      <span className="text-gray-500">{c.content}</span>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <input
                      value={commentDraft[p.id] || ''}
                      onChange={(e) => setCommentDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                      placeholder="Write a comment…"
                      className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 outline-none"
                    />
                    <button onClick={() => addComment(p.id)} className="text-xs px-2.5 py-1.5 rounded-lg font-medium text-white bg-blue-700">Send</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
      {filteredPosts.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-8">
          {filter === 'offers' ? 'Abhi koi offer post nahi hai.' : 'Abhi koi post nahi hai.'}
        </p>
      )}
    </div>
  )
}