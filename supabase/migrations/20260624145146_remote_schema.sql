--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 17.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: decrement_post_comments_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decrement_post_comments_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
    update public.posts
    set comments_count = comments_count - 1
    where id = OLD.post_id;
    return OLD;
end;
$$;


--
-- Name: delete_user_data(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_user_data(user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  -- Delete from profiles table
  delete from profiles where id = user_id;
  
  -- Delete from posts table
  delete from posts where user_id = user_id;
  
  -- Delete from comments table
  delete from comments where user_id = user_id;
  
  -- Add more table deletions as needed
  
  -- Commit the transaction
  commit;
end;
$$;


--
-- Name: get_nearby_users(uuid, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_nearby_users(user_id uuid, radius_km double precision) RETURNS TABLE(id uuid, distance double precision)
    LANGUAGE sql
    AS $$
WITH current_user_location AS (
    SELECT latitude AS user_lat, longitude AS user_lng
    FROM profiles
    WHERE id = user_id
),
distance_calc AS (
    SELECT 
        p.id,
        (
            6371 * ACOS(
                COS(RADIANS(c.user_lat)) 
                * COS(RADIANS(p.latitude))
                * COS(RADIANS(p.longitude) - RADIANS(c.user_lng))
                + SIN(RADIANS(c.user_lat)) 
                * SIN(RADIANS(p.latitude))
            )
        ) AS distance
    FROM profiles p
    CROSS JOIN current_user_location c
    WHERE p.id != user_id
)
SELECT id, distance
FROM distance_calc
WHERE distance <= radius_km
ORDER BY distance;
$$;


--
-- Name: get_post_likes_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_post_likes_count(post_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.post_likes
        WHERE post_likes.post_id = $1
    );
END;
$_$;


--
-- Name: handle_comment_likes_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_comment_likes_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.comments
        SET likes_count = likes_count + 1
        WHERE id = NEW.comment_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.comments
        SET likes_count = likes_count - 1
        WHERE id = OLD.comment_id;
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: handle_reply_likes_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_reply_likes_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.comment_replies
        SET likes_count = likes_count + 1
        WHERE id = NEW.reply_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.comment_replies
        SET likes_count = likes_count - 1
        WHERE id = OLD.reply_id;
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: has_user_liked_post(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_user_liked_post(post_id uuid, user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.post_likes
        WHERE post_likes.post_id = $1
        AND post_likes.profile_id = $2
    );
END;
$_$;


--
-- Name: increment_post_comments_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_post_comments_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
    update public.posts
    set comments_count = comments_count + 1
    where id = NEW.post_id;
    return NEW;
end;
$$;


--
-- Name: is_blah_recipient(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_blah_recipient(blah_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM messages m
        WHERE m.blah_id = $1 
        AND m.receiver_id = auth.uid()
    );
END;
$_$;


--
-- Name: is_blocked(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_blocked(blocker uuid, blocked uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  return exists(
    select 1 
    from public.blocks
    where blocker_id = blocker 
    and blocked_id = blocked
  );
end;
$$;


--
-- Name: prevent_critical_updates(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_critical_updates() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if NEW.post_id != OLD.post_id or 
       NEW.author_id != OLD.author_id or 
       NEW.created_at != OLD.created_at then
        raise exception 'Cannot update post_id, author_id, or created_at';
    end if;
    return NEW;
end;
$$;


--
-- Name: set_profile_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_profile_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.profile_id = (
    SELECT id FROM profiles
    WHERE id = NEW.user_id
    LIMIT 1
  );
  RETURN NEW;
END;
$$;


--
-- Name: update_comment_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_comment_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


--
-- Name: update_last_seen(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_last_seen() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  update online_users
  set last_seen = now()
  where id = new.id;
  return new;
end;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: blahs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blahs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    sender_id uuid,
    content text NOT NULL,
    type text,
    recipient_count integer,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT blahs_type_check CHECK ((type = ANY (ARRAY['text'::text, 'audio'::text])))
);


--
-- Name: blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    blocker_id uuid NOT NULL,
    blocked_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: comment_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment_likes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    comment_id uuid,
    profile_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: comment_replies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment_replies (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    comment_id uuid,
    profile_id uuid,
    reply_to_profile_id uuid,
    content text NOT NULL,
    likes_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_deleted boolean DEFAULT false
);


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    post_id uuid,
    profile_id uuid,
    content text NOT NULL,
    likes_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_deleted boolean DEFAULT false
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    participant1_id uuid NOT NULL,
    participant2_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    participant1_last_read_at timestamp with time zone,
    participant2_last_read_at timestamp with time zone,
    is_pinned boolean DEFAULT false,
    is_muted boolean DEFAULT false
);


--
-- Name: follow_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.follow_requests (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    follower_id uuid NOT NULL,
    followed_id uuid NOT NULL,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT friend_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'denied'::text])))
);


--
-- Name: follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.follows (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    follower_id uuid NOT NULL,
    followed_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    receive_blahs boolean DEFAULT true
);


--
-- Name: message_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_reactions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    message_id uuid,
    user_id uuid,
    reaction_type text NOT NULL,
    reaction_emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    text text,
    created_at timestamp with time zone DEFAULT now(),
    message_type character varying(10) DEFAULT 'text'::character varying,
    is_deleted boolean DEFAULT false,
    reply_to uuid,
    blah_id uuid,
    CONSTRAINT messages_message_type_check CHECK (((message_type)::text = ANY (ARRAY['text'::text, 'audio'::text, 'image'::text, 'file'::text])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    recipient_id uuid NOT NULL,
    type text,
    payload jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    sender_id uuid NOT NULL
);


--
-- Name: post_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_likes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    post_id uuid,
    profile_id uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    media_type text NOT NULL,
    main_media_url text NOT NULL,
    additional_media text[],
    comment text,
    music text,
    mentions text[],
    hashtags text[],
    hide_likes boolean DEFAULT false,
    hide_comments boolean DEFAULT false,
    hide_shares boolean DEFAULT false,
    is_locked boolean DEFAULT false,
    filter_applied text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    profile_id uuid,
    CONSTRAINT posts_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    updated_at timestamp with time zone,
    username text,
    full_name text,
    avatar_url text,
    bio text,
    expo_push_token text,
    birthday date,
    onboarding_completed boolean DEFAULT false,
    website_url text,
    latitude double precision,
    longitude double precision,
    location_enabled boolean DEFAULT false,
    CONSTRAINT username_length CHECK ((char_length(username) >= 3))
);


--
-- Name: reply_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reply_likes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    reply_id uuid,
    profile_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: typing_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.typing_status (
    user_id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    last_typed timestamp with time zone DEFAULT now()
);


--
-- Name: user_presence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_presence (
    user_id uuid NOT NULL,
    last_seen timestamp with time zone,
    status text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT user_presence_status_check CHECK ((status = ANY (ARRAY['online'::text, 'offline'::text])))
);


--
-- Name: blahs blahs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blahs
    ADD CONSTRAINT blahs_pkey PRIMARY KEY (id);


--
-- Name: blocks blocks_blocker_id_blocked_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_blocker_id_blocked_id_key UNIQUE (blocker_id, blocked_id);


--
-- Name: blocks blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_pkey PRIMARY KEY (id);


--
-- Name: comment_likes comment_likes_comment_id_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_comment_id_profile_id_key UNIQUE (comment_id, profile_id);


--
-- Name: comment_likes comment_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_pkey PRIMARY KEY (id);


--
-- Name: comment_replies comment_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_replies
    ADD CONSTRAINT comment_replies_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_participant1_id_participant2_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_participant1_id_participant2_id_key UNIQUE (participant1_id, participant2_id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: follow_requests friend_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_requests
    ADD CONSTRAINT friend_requests_pkey PRIMARY KEY (id);


--
-- Name: follows friends_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT friends_pkey PRIMARY KEY (id);


--
-- Name: follows friends_user_id_friend_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT friends_user_id_friend_id_key UNIQUE (follower_id, followed_id);


--
-- Name: message_reactions message_reactions_message_id_user_id_reaction_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_message_id_user_id_reaction_type_key UNIQUE (message_id, user_id, reaction_type);


--
-- Name: message_reactions message_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: post_likes post_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_pkey PRIMARY KEY (id);


--
-- Name: post_likes post_likes_post_id_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_post_id_profile_id_key UNIQUE (post_id, profile_id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: reply_likes reply_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reply_likes
    ADD CONSTRAINT reply_likes_pkey PRIMARY KEY (id);


--
-- Name: reply_likes reply_likes_reply_id_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reply_likes
    ADD CONSTRAINT reply_likes_reply_id_profile_id_key UNIQUE (reply_id, profile_id);


--
-- Name: typing_status typing_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_status
    ADD CONSTRAINT typing_status_pkey PRIMARY KEY (user_id, conversation_id);


--
-- Name: user_presence user_presence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_pkey PRIMARY KEY (user_id);


--
-- Name: comment_likes_comment_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comment_likes_comment_id_idx ON public.comment_likes USING btree (comment_id);


--
-- Name: comment_likes_profile_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comment_likes_profile_id_idx ON public.comment_likes USING btree (profile_id);


--
-- Name: comment_replies_comment_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comment_replies_comment_id_idx ON public.comment_replies USING btree (comment_id);


--
-- Name: comment_replies_profile_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comment_replies_profile_id_idx ON public.comment_replies USING btree (profile_id);


--
-- Name: comments_post_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comments_post_id_idx ON public.comments USING btree (post_id);


--
-- Name: comments_profile_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comments_profile_id_idx ON public.comments USING btree (profile_id);


--
-- Name: conversations_participant1_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX conversations_participant1_id_idx ON public.conversations USING btree (participant1_id);


--
-- Name: conversations_participant2_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX conversations_participant2_id_idx ON public.conversations USING btree (participant2_id);


--
-- Name: friend_requests_requester_id_recipient_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX friend_requests_requester_id_recipient_id_idx ON public.follow_requests USING btree (follower_id, followed_id) WHERE (status = 'pending'::text);


--
-- Name: idx_blahs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blahs_created_at ON public.blahs USING btree (created_at);


--
-- Name: idx_blahs_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blahs_sender_id ON public.blahs USING btree (sender_id);


--
-- Name: messages_conversation_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_conversation_id_idx ON public.messages USING btree (conversation_id);


--
-- Name: post_likes_post_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_likes_post_id_idx ON public.post_likes USING btree (post_id);


--
-- Name: post_likes_profile_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_likes_profile_id_idx ON public.post_likes USING btree (profile_id);


--
-- Name: posts_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_created_at_idx ON public.posts USING btree (created_at DESC);


--
-- Name: posts_profile_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_profile_id_idx ON public.posts USING btree (profile_id);


--
-- Name: posts_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_user_id_idx ON public.posts USING btree (user_id);


--
-- Name: reply_likes_profile_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reply_likes_profile_id_idx ON public.reply_likes USING btree (profile_id);


--
-- Name: reply_likes_reply_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reply_likes_reply_id_idx ON public.reply_likes USING btree (reply_id);


--
-- Name: comment_likes handle_comment_likes_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_comment_likes_count AFTER INSERT OR DELETE ON public.comment_likes FOR EACH ROW EXECUTE FUNCTION public.handle_comment_likes_count();


--
-- Name: comments handle_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: comment_replies handle_replies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_replies_updated_at BEFORE UPDATE ON public.comment_replies FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: reply_likes handle_reply_likes_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_reply_likes_count AFTER INSERT OR DELETE ON public.reply_likes FOR EACH ROW EXECUTE FUNCTION public.handle_reply_likes_count();


--
-- Name: notifications notifications; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notifications AFTER INSERT OR DELETE OR UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://whgjngkbhwjnwuupjkxn.supabase.co/functions/v1/notifications', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZ2puZ2tiaHdqbnd1dXBqa3huIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjUzNTYzOSwiZXhwIjoyMDQ4MTExNjM5fQ.2IWgK9e9BUFy-uXM4QNZnMF7gyZO6GQeVn-LgyzLn-8"}', '{}', '1000');


--
-- Name: posts set_post_profile_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_post_profile_id BEFORE INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.set_profile_id();


--
-- Name: posts update_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blahs blahs_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blahs
    ADD CONSTRAINT blahs_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id);


--
-- Name: blocks blocks_blocked_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES auth.users(id);


--
-- Name: blocks blocks_blocker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES auth.users(id);


--
-- Name: comment_likes comment_likes_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comment_likes comment_likes_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: comment_replies comment_replies_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_replies
    ADD CONSTRAINT comment_replies_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comment_replies comment_replies_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_replies
    ADD CONSTRAINT comment_replies_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: comment_replies comment_replies_reply_to_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_replies
    ADD CONSTRAINT comment_replies_reply_to_profile_id_fkey FOREIGN KEY (reply_to_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: comments comments_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_participant1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_participant1_id_fkey FOREIGN KEY (participant1_id) REFERENCES public.profiles(id);


--
-- Name: conversations conversations_participant2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_participant2_id_fkey FOREIGN KEY (participant2_id) REFERENCES public.profiles(id);


--
-- Name: typing_status fk_conversation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_status
    ADD CONSTRAINT fk_conversation FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: typing_status fk_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_status
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: follow_requests follow_requests_followed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_requests
    ADD CONSTRAINT follow_requests_followed_id_fkey FOREIGN KEY (followed_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: follow_requests follow_requests_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_requests
    ADD CONSTRAINT follow_requests_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: follows follows_followed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_followed_id_fkey FOREIGN KEY (followed_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: follows follows_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: follow_requests friend_requests_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_requests
    ADD CONSTRAINT friend_requests_recipient_id_fkey FOREIGN KEY (followed_id) REFERENCES public.profiles(id);


--
-- Name: follow_requests friend_requests_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_requests
    ADD CONSTRAINT friend_requests_requester_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id);


--
-- Name: follows friends_friend_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT friends_friend_id_fkey FOREIGN KEY (followed_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: follows friends_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT friends_user_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: message_reactions message_reactions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: message_reactions message_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_blah_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_blah_id_fkey FOREIGN KEY (blah_id) REFERENCES public.blahs(id);


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_reply_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_reply_to_fkey FOREIGN KEY (reply_to) REFERENCES public.messages(id);


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id);


--
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id);


--
-- Name: notifications notifications_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: post_likes post_likes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_likes post_likes_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: posts posts_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id);


--
-- Name: posts posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);


--
-- Name: reply_likes reply_likes_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reply_likes
    ADD CONSTRAINT reply_likes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: reply_likes reply_likes_reply_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reply_likes
    ADD CONSTRAINT reply_likes_reply_id_fkey FOREIGN KEY (reply_id) REFERENCES public.comment_replies(id) ON DELETE CASCADE;


--
-- Name: user_presence user_presence_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: comment_likes Anyone can view comment likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view comment likes" ON public.comment_likes FOR SELECT USING (true);


--
-- Name: comments Anyone can view non-deleted comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view non-deleted comments" ON public.comments FOR SELECT USING ((NOT is_deleted));


--
-- Name: comment_replies Anyone can view non-deleted replies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view non-deleted replies" ON public.comment_replies FOR SELECT USING ((NOT is_deleted));


--
-- Name: user_presence Anyone can view presence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view presence" ON public.user_presence FOR SELECT USING (true);


--
-- Name: reply_likes Anyone can view reply likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view reply likes" ON public.reply_likes FOR SELECT USING (true);


--
-- Name: comments Authenticated users can create comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create comments" ON public.comments FOR INSERT TO authenticated WITH CHECK ((auth.uid() = profile_id));


--
-- Name: comment_replies Authenticated users can create replies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create replies" ON public.comment_replies FOR INSERT TO authenticated WITH CHECK ((auth.uid() = profile_id));


--
-- Name: comment_likes Authenticated users can like comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can like comments" ON public.comment_likes FOR INSERT TO authenticated WITH CHECK ((auth.uid() = profile_id));


--
-- Name: reply_likes Authenticated users can like replies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can like replies" ON public.reply_likes FOR INSERT TO authenticated WITH CHECK ((auth.uid() = profile_id));


--
-- Name: conversations Participants can update conversation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Participants can update conversation" ON public.conversations FOR UPDATE TO authenticated USING (((auth.uid() = participant1_id) OR (auth.uid() = participant2_id)));


--
-- Name: profiles Public profiles are viewable by everyone.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);


--
-- Name: blahs Recipients can view blahs sent to them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Recipients can view blahs sent to them" ON public.blahs FOR SELECT TO authenticated USING (public.is_blah_recipient(id));


--
-- Name: message_reactions Users can add reactions to messages in their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add reactions to messages in their conversations" ON public.message_reactions FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM (public.messages m
     JOIN public.conversations c ON ((m.conversation_id = c.id)))
  WHERE ((m.id = message_reactions.message_id) AND ((c.participant1_id = auth.uid()) OR (c.participant2_id = auth.uid()))))) AND (auth.uid() = user_id)));


--
-- Name: blocks Users can create blocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create blocks" ON public.blocks FOR INSERT WITH CHECK ((auth.uid() = blocker_id));


--
-- Name: notifications Users can create notifications for other users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create notifications for other users" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: blahs Users can create their own blahs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own blahs" ON public.blahs FOR INSERT TO authenticated WITH CHECK ((auth.uid() = sender_id));


--
-- Name: posts Users can create their own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: blahs Users can delete their own blahs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own blahs" ON public.blahs FOR DELETE TO authenticated USING ((auth.uid() = sender_id));


--
-- Name: blocks Users can delete their own blocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own blocks" ON public.blocks FOR DELETE USING ((auth.uid() = blocker_id));


--
-- Name: post_likes Users can delete their own likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own likes" ON public.post_likes FOR DELETE USING ((profile_id = auth.uid()));


--
-- Name: posts Users can delete their own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE TO authenticated USING (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE (profiles.id = posts.profile_id)))));


--
-- Name: message_reactions Users can delete their own reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own reactions" ON public.message_reactions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: post_likes Users can insert their own likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own likes" ON public.post_likes FOR INSERT WITH CHECK (((profile_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.posts
  WHERE ((posts.id = post_likes.post_id) AND (posts.is_locked = false))))));


--
-- Name: profiles Users can insert their own profile.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = id));


--
-- Name: typing_status Users can manage their own typing status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own typing status" ON public.typing_status USING ((auth.uid() = user_id));


--
-- Name: comment_likes Users can remove their own likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove their own likes" ON public.comment_likes FOR DELETE TO authenticated USING ((auth.uid() = profile_id));


--
-- Name: reply_likes Users can remove their own reply likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove their own reply likes" ON public.reply_likes FOR DELETE TO authenticated USING ((auth.uid() = profile_id));


--
-- Name: blocks Users can see blocks they're involved in; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can see blocks they're involved in" ON public.blocks FOR SELECT USING (((auth.uid() = blocker_id) OR (auth.uid() = blocked_id)));


--
-- Name: profiles Users can update own profile.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING ((( SELECT auth.uid() AS uid) = id));


--
-- Name: blahs Users can update their own blahs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own blahs" ON public.blahs FOR UPDATE TO authenticated USING ((auth.uid() = sender_id)) WITH CHECK ((auth.uid() = sender_id));


--
-- Name: comments Users can update their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE TO authenticated USING ((auth.uid() = profile_id)) WITH CHECK ((auth.uid() = profile_id));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE TO authenticated USING ((auth.uid() = recipient_id)) WITH CHECK ((auth.uid() = recipient_id));


--
-- Name: posts Users can update their own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE TO authenticated USING (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE (profiles.id = posts.profile_id))))) WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE (profiles.id = posts.profile_id)))));


--
-- Name: user_presence Users can update their own presence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own presence" ON public.user_presence USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: message_reactions Users can update their own reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own reactions" ON public.message_reactions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: comment_replies Users can update their own replies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own replies" ON public.comment_replies FOR UPDATE TO authenticated USING ((auth.uid() = profile_id)) WITH CHECK ((auth.uid() = profile_id));


--
-- Name: post_likes Users can view likes on public posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view likes on public posts" ON public.post_likes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.posts
  WHERE ((posts.id = post_likes.post_id) AND ((posts.hide_likes = false) OR (posts.profile_id = auth.uid()))))));


--
-- Name: posts Users can view non-locked posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view non-locked posts" ON public.posts FOR SELECT TO authenticated USING (((NOT is_locked) OR (user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE (profiles.id = posts.profile_id)))));


--
-- Name: message_reactions Users can view reactions for their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view reactions for their conversations" ON public.message_reactions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.messages m
     JOIN public.conversations c ON ((m.conversation_id = c.id)))
  WHERE ((m.id = message_reactions.message_id) AND ((c.participant1_id = auth.uid()) OR (c.participant2_id = auth.uid()))))));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT TO authenticated USING ((auth.uid() = recipient_id));


--
-- Name: blahs Users can view their own sent blahs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own sent blahs" ON public.blahs FOR SELECT TO authenticated USING ((auth.uid() = sender_id));


--
-- Name: blahs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blahs ENABLE ROW LEVEL SECURITY;

--
-- Name: blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: comment_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: comment_replies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comment_replies ENABLE ROW LEVEL SECURITY;

--
-- Name: comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: follow_requests delete_own_friend_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY delete_own_friend_requests ON public.follow_requests FOR DELETE USING (((auth.uid() = follower_id) OR (auth.uid() = followed_id)));


--
-- Name: follows delete_own_friends; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY delete_own_friends ON public.follows FOR DELETE USING (((auth.uid() = follower_id) OR (auth.uid() = followed_id)));


--
-- Name: follow_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: follows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations insert_own_conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insert_own_conversations ON public.conversations FOR INSERT WITH CHECK (((auth.uid() = participant1_id) OR (auth.uid() = participant2_id)));


--
-- Name: follow_requests insert_own_friend_request; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insert_own_friend_request ON public.follow_requests FOR INSERT WITH CHECK ((auth.uid() = follower_id));


--
-- Name: follows insert_own_friends; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insert_own_friends ON public.follows FOR INSERT WITH CHECK (((auth.uid() = follower_id) OR (auth.uid() = followed_id)));


--
-- Name: messages insert_own_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insert_own_messages ON public.messages FOR INSERT WITH CHECK (((auth.uid() = sender_id) AND (auth.uid() IN ( SELECT conversations.participant1_id
   FROM public.conversations
  WHERE (conversations.id = messages.conversation_id)
UNION
 SELECT conversations.participant2_id
   FROM public.conversations
  WHERE (conversations.id = messages.conversation_id)))));


--
-- Name: message_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: post_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: reply_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reply_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations select_own_conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_own_conversations ON public.conversations FOR SELECT USING (((auth.uid() = participant1_id) OR (auth.uid() = participant2_id)));


--
-- Name: follow_requests select_own_friend_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_own_friend_requests ON public.follow_requests FOR SELECT USING (((auth.uid() = follower_id) OR (auth.uid() = followed_id)));


--
-- Name: follows select_own_friends; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_own_friends ON public.follows FOR SELECT USING (((auth.uid() = follower_id) OR (auth.uid() = followed_id)));


--
-- Name: messages select_own_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_own_messages ON public.messages FOR SELECT USING (((auth.uid() = sender_id) OR (auth.uid() IN ( SELECT conversations.participant1_id
   FROM public.conversations
  WHERE (conversations.id = messages.conversation_id)
UNION
 SELECT conversations.participant2_id
   FROM public.conversations
  WHERE (conversations.id = messages.conversation_id)))));


--
-- Name: notifications select_own_notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_own_notifications ON public.notifications FOR SELECT USING ((auth.uid() = recipient_id));


--
-- Name: typing_status; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

--
-- Name: follow_requests update_own_friend_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY update_own_friend_requests ON public.follow_requests FOR UPDATE USING (((auth.uid() = follower_id) OR (auth.uid() = followed_id))) WITH CHECK (((auth.uid() = follower_id) OR (auth.uid() = followed_id)));


--
-- Name: user_presence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

