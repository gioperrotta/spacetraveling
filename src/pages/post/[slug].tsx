import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { FiCalendar, FiClock, FiUser } from 'react-icons/fi'
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Prismic from '@prismicio/client';
import { RichText, } from 'prismic-dom';
import { getPrismicClient } from '../../services/prismic';

import Comments from '../../components/Comments';

import styles from './post.module.scss';

interface Post {
  uid: string;
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  }
}

interface NeighborPost {
  title: string;
  slug: string;
}


interface PostProps {
  post: Post;
  prevPost: NeighborPost;
  nextPost: NeighborPost;
}

export default function Post({ post, prevPost, nextPost }: PostProps) {
  const [timeRead, setTimeRead] = useState(0);
 // const [nextPost, setNextPost] = useState<NeighborPost | false>({ title: '', slug: '' })
 // const [prevPost, setPrevPost] = useState<NeighborPost | false>({ title: '', slug: '' })

  const router = useRouter()
  if (router.isFallback) {
    return <div className={styles.loading}>Carregando...</div>
  }

  useEffect(() => {
    // loadNeighborsPosts()
    const textHeading = post.data.content.map(item => item.heading)
    const textBody = post.data.content.map(item => RichText.asText(item.body))

    const wordsArray = [...textBody, ...textHeading]

    const allWords = wordsArray.reduce((total, array) => total + array).split(" ")

    const timeRead = Math.ceil(allWords.length / 200)

    setTimeRead(timeRead)
  }, [post])

  return (
    <>
      <Head>
        <title>{post.data.title}</title>
      </Head>
      <div className={styles.container}>
        <div className={styles.banner} >
          <img src={post.data.banner.url} alt="banner" />
        </div>

        <div className={styles['container-text']}>
          <h1>{post.data.title}</h1>
          <div className={styles['post-info']}>
            <div>
              <span> <FiUser /> {post.data.author}  </span>
              <span>
                <FiCalendar />
                {format(
                  new Date(post.first_publication_date),
                  "dd MMM yyyy", { locale: ptBR, }
                )}
              </span>
              <span><FiClock /> {timeRead} min </span>
            </div>
            {/*  POST EDITADO */}
          </div>

          {post.data.content.map(content => (
            <div key={Math.random()} className={styles.section}>
              <h2>{content.heading}</h2>
              <p dangerouslySetInnerHTML={{ __html: RichText.asHtml(content.body.map(item => item)) }}></p>
            </div>
          ))}

        </div>

        <div className={styles.line}></div>


        <div className={styles['container-posts-pagination']} >
          {prevPost ? (
            <Link href={`/post/${prevPost?.slug}`}>
              <div>
                <span>{prevPost?.title}</span>
                <span>Post Anterior</span>
              </div>
            </Link>
          ) : ''}

          {nextPost ? (
            <Link href={`/post/${nextPost.slug}`}>
              <div>
                <span>{nextPost.title}</span>
                <span>Próximo Post</span>
              </div>
            </Link>
          ) : ''}

        </div>
        <div className={styles.comments}>
          <Comments/>
        </div>
      </div>

    </>
  )
};

function verifyNeighborPost(post, slug): NeighborPost | null {
  return slug === post.results[0].uid
    ? null
    : {
      title: post.results[0]?.data?.title,
      slug: post.results[0]?.uid,
    };
}

export const getStaticProps: GetStaticProps<PostProps> = async ({ params }) => {

  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  const responsePrevPost = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts')
  ],
  {
    pageSize: 1,
    after: slug,
    orderings: '[document.first_publication_date desc]',
  }
  );

  const prevPost = verifyNeighborPost(responsePrevPost, slug);

  const responseNextPost = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts')
  ],
  {
    pageSize: 1,
    after: slug,
    orderings: '[document.first_publication_date]',
  }
  );

  const nextPost = verifyNeighborPost(responseNextPost, slug);

 const post: Post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: response.data.banner,
      author: response.data.author,
      content: response.data.content,
    },
  };

  return {
    props: {
      post,
      prevPost,
      nextPost
    },
    revalidate: 60 * 60,// 1(one) hour
  }
};

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    Prismic.Predicates.at('document.type', 'posts'),
    {
      orderings: '[document.first_publication_date]',
      pageSize: 3
    }
  );

  const slugs = posts.results.reduce((arr, post) => {
    arr.push(post.uid);
    return arr;
  }, []);

  const params = slugs.map(slug => {
    return {
      params: { slug }
    }
  });

  return {
    paths: params,
    fallback: true
  }
};


