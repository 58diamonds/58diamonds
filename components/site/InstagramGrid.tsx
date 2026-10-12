/* eslint-disable @next/next/no-img-element */
import type { InstagramPost } from '@/lib/types';

/**
 * The latest Instagram posts, synced into the database by /api/instagram.
 * Not a live embed: images are served from our own storage, so the page stays
 * fast and never breaks when Instagram changes its links.
 */
export function InstagramGrid({ posts }: { posts: InstagramPost[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {posts.map((post) => (
        <a key={post.id} href={post.permalink} target="_blank" rel="noreferrer" className="group block overflow-hidden">
          <img
            src={post.image_url}
            alt={post.caption ? post.caption.slice(0, 120) : 'Instagram'}
            className="aspect-square w-full object-cover transition duration-700 group-hover:scale-[1.04]"
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}
