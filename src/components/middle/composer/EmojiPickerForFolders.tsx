import type { FC } from "../../../lib/teact/teact";
import React, {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "../../../lib/teact/teact";
import { withGlobal } from "../../../global";

import type { GlobalState } from "../../../global/types";
import type { IconName } from "../../../types/icons";
import type {
  EmojiData,
  EmojiModule,
  EmojiRawData,
} from "../../../util/emoji/emoji";

import {
  MENU_TRANSITION_DURATION,
  RECENT_SYMBOL_SET_ID,
} from "../../../config";
import animateHorizontalScroll from "../../../util/animateHorizontalScroll";
import animateScroll from "../../../util/animateScroll";
import buildClassName from "../../../util/buildClassName";
import { handleEmojiLoad, uncompressEmoji } from "../../../util/emoji/emoji";
import { pick } from "../../../util/iteratees";
import { MEMO_EMPTY_ARRAY } from "../../../util/memo";
import { IS_TOUCH_ENV } from "../../../util/windowEnvironment";
import { REM } from "../../common/helpers/mediaDimensions";

import useAppLayout from "../../../hooks/useAppLayout";
import useHorizontalScroll from "../../../hooks/useHorizontalScroll";
import { useIntersectionObserver } from "../../../hooks/useIntersectionObserver";
import useLastCallback from "../../../hooks/useLastCallback";
import useOldLang from "../../../hooks/useOldLang";
import useScrolledState from "../../../hooks/useScrolledState";
import useAsyncRendering from "../../right/hooks/useAsyncRendering";

import bot from "../../../Icons/bot.svg";
import channel from "../../../Icons/channel.svg";
import chat from "../../../Icons/chat.svg";
import chats from "../../../Icons/chats.svg";
import folder from "../../../Icons/folder.svg";
import group from "../../../Icons/group.svg";
import star from "../../../Icons/star.svg";
import user from "../../../Icons/user.svg";

import Icon from "../../common/icons/Icon";
import Button from "../../ui/Button";
import Loading from "../../ui/Loading";
import EmojiCategory from "./EmojiCategory";
import Transition from "../../ui/Transition";
import SymbolMenuFooter, {
  SYMBOL_MENU_TAB_TITLES,
  SymbolMenuTabs,
} from "./SymbolMenuFooter";
import "./EmojiPicker.scss";
import Portal from "../../ui/Portal";

type OwnProps = {
  setCurrentFolderEmoji: (
    newValue: string | ((current: string) => string)
  ) => void;
  className?: string;
  onEmojiSelect: (emoji: string, name: string) => void;
};

type StateProps = Pick<GlobalState, "recentEmojis">;

type EmojiCategoryData = { id: string; name: string; emojis: string[] };

const ICONS_BY_CATEGORY: Record<string, IconName> = {
  recent: "recent",
  people: "smile",
  nature: "animals",
  foods: "eats",
  activity: "sport",
  places: "car",
  objects: "lamp",
  symbols: "language",
  flags: "flag",
};

const OPEN_ANIMATION_DELAY = 200;
const SMOOTH_SCROLL_DISTANCE = 100;
const FOCUS_MARGIN = 3.25 * REM;
const HEADER_BUTTON_WIDTH = 2.625 * REM; // Includes margins
const INTERSECTION_THROTTLE = 200;

const categoryIntersections: boolean[] = [];

let emojiDataPromise: Promise<EmojiModule>;
let emojiRawData: EmojiRawData;
let emojiData: EmojiData;

const EmojiPicker: FC<OwnProps & StateProps> = ({
  className,
  recentEmojis,
  setCurrentFolderEmoji,
  onEmojiSelect,
}) => {
  // eslint-disable-next-line no-null/no-null
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-null/no-null
  const headerRef = useRef<HTMLDivElement>(null);

  const [categories, setCategories] = useState<EmojiCategoryData[]>();
  const [emojis, setEmojis] = useState<AllEmojis>();
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const { isMobile } = useAppLayout();
  const {
    handleScroll: handleContentScroll,
    isAtBeginning: shouldHideTopBorder,
  } = useScrolledState();

  const { observe: observeIntersection } = useIntersectionObserver(
    {
      rootRef: containerRef,
      throttleMs: INTERSECTION_THROTTLE,
    },
    (entries) => {
      entries.forEach((entry) => {
        const { id } = entry.target as HTMLDivElement;
        if (!id || !id.startsWith("emoji-category-")) {
          return;
        }

        const index = Number(id.replace("emoji-category-", ""));
        categoryIntersections[index] = entry.isIntersecting;
      });

      const minIntersectingIndex = categoryIntersections.reduce(
        (lowestIndex, isIntersecting, index) => {
          return isIntersecting && index < lowestIndex ? index : lowestIndex;
        },
        Infinity
      );

      if (minIntersectingIndex === Infinity) {
        return;
      }

      setActiveCategoryIndex(minIntersectingIndex);
    }
  );

  const canRenderContents = useAsyncRendering([], MENU_TRANSITION_DURATION);
  const shouldRenderContent = emojis && canRenderContents;

  useHorizontalScroll(headerRef, !(isMobile && shouldRenderContent));

  // Scroll header when active set updates
  useEffect(() => {
    if (!categories) {
      return;
    }

    const header = headerRef.current;
    if (!header) {
      return;
    }

    const newLeft =
      activeCategoryIndex * HEADER_BUTTON_WIDTH -
      header.offsetWidth / 2 +
      HEADER_BUTTON_WIDTH / 2;

    animateHorizontalScroll(header, newLeft);
  }, [categories, activeCategoryIndex]);

  const lang = useOldLang();

  const allCategories = useMemo(() => {
    if (!categories) {
      return MEMO_EMPTY_ARRAY;
    }
    const themeCategories = [...categories];
    if (recentEmojis?.length) {
      themeCategories.unshift({
        id: RECENT_SYMBOL_SET_ID,
        name: lang("RecentStickers"),
        emojis: recentEmojis,
      });
    }

    return themeCategories;
  }, [categories, lang, recentEmojis]);

  // Initialize data on first render.
  useEffect(() => {
    setTimeout(() => {
      const exec = () => {
        setCategories(emojiData.categories);

        setEmojis(emojiData.emojis as AllEmojis);
      };

      if (emojiData) {
        exec();
      } else {
        ensureEmojiData().then(exec);
      }
    }, OPEN_ANIMATION_DELAY);
  }, []);

  const selectCategory = useLastCallback((index: number) => {
    setActiveCategoryIndex(index);
    const categoryEl = containerRef
      .current!.closest<HTMLElement>(".SymbolMenu-main")!
      .querySelector(`#emoji-category-${index}`)! as HTMLElement;
    animateScroll({
      container: containerRef.current!,
      element: categoryEl,
      position: "start",
      margin: FOCUS_MARGIN,
      maxDistance: SMOOTH_SCROLL_DISTANCE,
    });
  });

  const handleEmojiSelect = useLastCallback((emoji: string, name: string) => {
    onEmojiSelect(emoji, name);
  });

  function renderCategoryButton(category: EmojiCategoryData, index: number) {
    const icon = ICONS_BY_CATEGORY[category.id];

    return (
      icon && (
        <Button
          className={`symbol-set-button ${
            index === activeCategoryIndex ? "activated" : ""
          }`}
          round
          faded
          color="translucent"
          // eslint-disable-next-line react/jsx-no-bind
          onClick={() => selectCategory(index)}
          ariaLabel={category.name}
        >
          <Icon name={icon} />
        </Button>
      )
    );
  }

  const containerClassName = buildClassName("EmojiPicker", className);

  if (!shouldRenderContent) {
    return (
      <div className={containerClassName}>
        <Loading />
      </div>
    );
  }
  const [activeTab, setActiveTab] = useState<number>(0);
  const headerClassName = buildClassName(
    "EmojiPicker-header",
    !shouldHideTopBorder && "with-top-border"
  );
  function stopPropagation(event: any) {
    event.stopPropagation();
  }
  return (
    <div className="SymbolMenu-main" onClick={stopPropagation}>
      {
        <Transition
          name="slide"
          activeKey={activeTab}
          renderCount={Object.values(SYMBOL_MENU_TAB_TITLES).length}
        >
          <div className={containerClassName}>
            <div
              ref={headerRef}
              className={headerClassName}
              dir={lang.isRtl ? "rtl" : undefined}
            >
              {allCategories.map(renderCategoryButton)}
            </div>{" "}
            <img
              src={bot}
              className="FolderEmoji"
              loading="lazy"
              data-path={bot}
              onLoad={handleEmojiLoad}
              draggable={false}
              onClick={() => {
                setCurrentFolderEmoji("🤖");
              }}
            />
            <img
              src={channel}
              className="FolderEmoji"
              loading="lazy"
              data-path={channel}
              onLoad={handleEmojiLoad}
              draggable={false}
              onClick={() => {
                setCurrentFolderEmoji("📢");
              }}
            />
            <img
              src={chats}
              className="FolderEmoji"
              loading="lazy"
              data-path={chats}
              onLoad={handleEmojiLoad}
              draggable={false}
              onClick={() => {
                setCurrentFolderEmoji("✅");
              }}
            />
            <img
              src={chat}
              className="FolderEmoji"
              loading="lazy"
              data-path={chat}
              onLoad={handleEmojiLoad}
              draggable={false}
              onClick={() => {
                setCurrentFolderEmoji("💬");
              }}
            />{" "}
            <img
              src={group}
              className="FolderEmoji"
              loading="lazy"
              data-path={group}
              onLoad={handleEmojiLoad}
              draggable={false}
              onClick={() => {
                setCurrentFolderEmoji("👥");
              }}
            />{" "}
            <img
              src={star}
              className="FolderEmoji"
              loading="lazy"
              data-path={star}
              onLoad={handleEmojiLoad}
              draggable={false}
              onClick={() => {
                setCurrentFolderEmoji("⭐️");
              }}
            />{" "}
            <img
              src={user}
              className="FolderEmoji"
              loading="lazy"
              data-path={user}
              onLoad={handleEmojiLoad}
              draggable={false}
              onClick={() => {
                setCurrentFolderEmoji("👤");
              }}
            />{" "}
            <img
              src={folder}
              className="FolderEmoji"
              loading="lazy"
              data-path={folder}
              onLoad={handleEmojiLoad}
              draggable={false}
              onClick={() => {
                setCurrentFolderEmoji("");
              }}
            />{" "}
            <div
              ref={containerRef}
              onScroll={handleContentScroll}
              className={buildClassName(
                "EmojiPicker-main",
                IS_TOUCH_ENV ? "no-scrollbar" : "custom-scroll"
              )}
            >
              {allCategories.map((category, i) => (
                <EmojiCategory
                  category={category}
                  index={i}
                  allEmojis={emojis}
                  observeIntersection={observeIntersection}
                  shouldRender={
                    activeCategoryIndex >= i - 1 && activeCategoryIndex <= i + 1
                  }
                  onEmojiSelect={handleEmojiSelect}
                />
              ))}
            </div>
          </div>
        </Transition>
      }
    </div>
  );
};

async function ensureEmojiData() {
  if (!emojiDataPromise) {
    emojiDataPromise = import("emoji-data-ios/emoji-data.json");
    emojiRawData = (await emojiDataPromise).default;

    emojiData = uncompressEmoji(emojiRawData);
  }

  return emojiDataPromise;
}

export default memo(
  withGlobal<OwnProps>((global): StateProps => pick(global, ["recentEmojis"]))(
    EmojiPicker
  )
);
