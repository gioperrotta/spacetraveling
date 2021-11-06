import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { GetStaticProps } from 'next';

import Prismic from '@prismicio/client';
import { getPrismicClient } from '../services/prismic';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser } from 'react-icons/fi'

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';


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
}

export default function Home({ postsPagination }: HomeProps) {
  const [posts, setPosts] = useState<Post[]>(postsPagination.results);
  const [nextPage, setNextPage] = useState<string | false>(postsPagination.next_page);

  useEffect(() => {
    if (!postsPagination.next_page) {
      setNextPage(false);
    }

    const newPosts = postsPagination.results.map((post: Post) => {
      return {
        uid: post.uid,
        first_publication_date: post.first_publication_date,
        data: {
          title: post.data.title,
          subtitle: post.data.subtitle,
          author: post.data.author
        }
      }
    });
    setPosts(newPosts)
  }, [postsPagination.results]);

  async function handlePaginate() {
    fetch(nextPage as any)
      .then(response => response.json())
      .then(data => {
        const newPosts = data.results.map((post: Post) => {
          return {
            uid: post.uid,
            first_publication_date: post.first_publication_date,
            data: {
              title: post.data.title,
              subtitle: post.data.subtitle,
              author: post.data.author
            }
          }
        })
        setPosts([...posts, ...newPosts])

        if (!data.next_page) {
          setNextPage(false)
        } else {
          setNextPage(data.next_page)
        }
      })
  };

  return (
    <div className={styles.container} >
      <Head> SpaceTraveling | Home </Head>
      {posts.map(post => {
        return (
          <div className={styles.content} key={post.uid}>
            <Link href={`/post/${post.uid}`}>
              <h2>{post.data.title}</h2>
            </Link>
            <p>{post.data.subtitle}</p>
            <div className={styles["post-info"]}>
              <span>
                <FiCalendar />
                {
                  format(
                    new Date(post.first_publication_date),
                    "dd MMM yyyy",
                    {
                      locale: ptBR,
                    }
                  )
                }
              </span>
              <span> <FiUser /> {post.data.author} </span>
            </div>
          </div>
        )
      })}
      {
        nextPage &&
        <button
          onClick={handlePaginate}
        >
          Carregar mais posts
        </button>
      }
    </div>
  );

  //   // TODO
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ], {
    fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
    pageSize: 1,
  });

  return {
    props: {
      postsPagination: {
        next_page: postsResponse.next_page ? postsResponse.next_page : false,
        results: postsResponse.results
      }
    },
    revalidate: 60 * 60 // 1(one) Hour
  }
};
