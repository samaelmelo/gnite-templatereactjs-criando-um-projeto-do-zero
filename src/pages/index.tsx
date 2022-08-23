import { GetStaticProps } from 'next';
import Link from 'next/link';
import Head from 'next/head';
import { FiCalendar, FiUser } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { useState } from 'react';
import { Document } from '@prismicio/client/types/documents';
import ApiSearchResponse from '@prismicio/client/types/ApiSearchResponse';
import { getPrismicClient } from '../services/prismic';

import styles from './home.module.scss';
import { ExitPreviewButton } from '../components/ExitPreviewButton';
import Header from '../components/Header';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: boolean;
}

export default function Home({
  postsPagination,
  preview,
}: HomeProps): JSX.Element {
  const [posts, setPosts] = useState<Post[]>(postsPagination.results);
  const [nextPage, setNextPage] = useState<string>(postsPagination.next_page);

  async function handleMorePosts(): Promise<void> {
    const response = await fetch(nextPage);
    const jsonResponse = (await response.json()) as ApiSearchResponse;

    const newPosts = jsonResponse.results.map((post: Document) => ({
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    }));

    setPosts([...posts, ...newPosts]);
    setNextPage(jsonResponse.next_page);
  }

  return (
    <>
      <Head>
        <title>Home | Space Travelling</title>
      </Head>
      <main className={styles.container}>
        <Header />
        {posts.map(post => (
          <Link href={`/post/${post.uid}`} key={post.uid}>
            <a className={styles.post} title={`Post: ${post.data.title}`}>
              <strong>{post.data.title}</strong>
              <p>{post.data.subtitle}</p>
              <div className={styles.info}>
                <div>
                  <FiCalendar size={20} />
                  <span>
                    {format(
                      new Date(post.first_publication_date),
                      'dd MMM yyyy',
                      {
                        locale: ptBR,
                      }
                    )}
                  </span>
                </div>
                <div>
                  <FiUser size={20} />
                  <span>{post.data.author}</span>
                </div>
              </div>
            </a>
          </Link>
        ))}

        {nextPage && (
          <button
            type="button"
            className={styles.loadMorePosts}
            onClick={handleMorePosts}
          >
            Carregar mais posts
          </button>
        )}
        {preview && <ExitPreviewButton className={styles.exitPreview} />}
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async ({
  preview = false,
  previewData = null,
}) => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 3,
      orderings: '[document.last_publication_date desc]',
    }
  );

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
        content: post.data.content.map(content => {
          return {
            heading: content.heading,
            body: [...content.body],
          };
        }),
      },
    };
  });

  const postsPagination = {
    next_page: postsResponse.next_page,
    results: posts,
  };

  return {
    props: {
      postsPagination,
      preview,
    },
    revalidate: 1800,
  };
};
