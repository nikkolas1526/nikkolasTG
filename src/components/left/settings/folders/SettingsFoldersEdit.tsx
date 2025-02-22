import type { FC } from "../../../../lib/teact/teact";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "../../../../lib/teact/teact";
import { getActions, getGlobal, withGlobal } from "../../../../global";

import {
  ApiMessageEntityTypes,
  type ApiChatlistExportedInvite,
} from "../../../../api/types";
import type {
  FolderEditDispatch,
  FoldersState,
} from "../../../../hooks/reducers/useFoldersReducer";

import { STICKER_SIZE_FOLDER_SETTINGS } from "../../../../config";
import { isUserId } from "../../../../global/helpers";
import { selectCanShareFolder } from "../../../../global/selectors";
import { selectCurrentLimit } from "../../../../global/selectors/limits";
import { findIntersectionWithSet } from "../../../../util/iteratees";
import { MEMO_EMPTY_ARRAY } from "../../../../util/memo";
import {
  CUSTOM_PEER_EXCLUDED_CHAT_TYPES,
  CUSTOM_PEER_INCLUDED_CHAT_TYPES,
} from "../../../../util/objects/customPeer";
import { LOCAL_TGS_URLS } from "../../../common/helpers/animatedAssets";

import { selectChatFilters } from "../../../../hooks/reducers/useFoldersReducer";
import useHistoryBack from "../../../../hooks/useHistoryBack";
import useOldLang from "../../../../hooks/useOldLang";

import AnimatedIcon from "../../../common/AnimatedIcon";
import GroupChatInfo from "../../../common/GroupChatInfo";
import Icon from "../../../common/icons/Icon";
import PrivateChatInfo from "../../../common/PrivateChatInfo";
import FloatingActionButton from "../../../ui/FloatingActionButton";
import InputText from "../../../ui/InputText";
import ListItem from "../../../ui/ListItem";
import Spinner from "../../../ui/Spinner";
import bot from "../../../../Icons/bot.svg";
import channel from "../../../../Icons/channel.svg";
import chat from "../../../../Icons/chat.svg";
import chats from "../../../../Icons/chats.svg";
import folder from "../../../../Icons/folder.svg";
import group from "../../../../Icons/group.svg";
import star from "../../../../Icons/star.svg";
import user from "../../../../Icons/user.svg";
import useLastCallback from "../../../../hooks/useLastCallback";
import EmojiPickerForFolders from "../../../middle/composer/EmojiPickerForFolders";
import "./folders.css";
import { pathBytesToSvg } from "../../../../api/gramjs/apiBuilders/pathBytesToSvg";

type OwnProps = {
  state: FoldersState;
  dispatch: FolderEditDispatch;
  onAddIncludedChats: VoidFunction;
  onAddExcludedChats: VoidFunction;
  onShareFolder: VoidFunction;
  onOpenInvite: (url: string) => void;
  isActive?: boolean;
  isOnlyInvites?: boolean;
  onReset: () => void;
  onBack: () => void;
  onSaveFolder: (cb?: VoidFunction) => void;
};

type StateProps = {
  loadedActiveChatIds?: string[];
  loadedArchivedChatIds?: string[];
  invites?: ApiChatlistExportedInvite[];
  isRemoved?: boolean;
  maxInviteLinks: number;
  maxChatLists: number;
  chatListCount: number;
};
const Regex =
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FB00}-\u{1FBFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\u{FE0F}?/u;
const SUBMIT_TIMEOUT = 500;

const INITIAL_CHATS_LIMIT = 5;

export const ERROR_NO_TITLE = "Please provide a title for this folder.";
export const ERROR_NO_CHATS = "ChatList.Filter.Error.Empty";

const SettingsFoldersEdit: FC<OwnProps & StateProps> = ({
  state,
  dispatch,
  onAddIncludedChats,
  onAddExcludedChats,
  onShareFolder,
  onOpenInvite,
  isActive,
  onReset,
  isRemoved,
  onBack,
  loadedActiveChatIds,
  isOnlyInvites,
  loadedArchivedChatIds,
  invites,
  maxInviteLinks,
  maxChatLists,
  chatListCount,
  onSaveFolder,
}) => {
  const [currentFolderIcon, setCurrentFolderIcon] = useState<string>(folder);
  const [currentFolderEmoji, setCurrentFolderEmoji] = useState<string>("");
  const [halfTitle, setHalfTitle] = useState<string>("");
  useEffect(() => {
    setHalfTitle(removeEmojis(state.folder.title.text));
    console.log(setHalfTitle);
  }, []);
  useEffect(() => {
    dispatch({
      type: "setTitle",
      payload: currentFolderEmoji + halfTitle.trim(),
    });
    console.log(currentFolderEmoji);
  }, [currentFolderEmoji]);
  useEffect(() => {
    dispatch({
      type: "setTitle",
      payload: currentFolderEmoji + halfTitle.trim(),
    });
  }, [halfTitle]);
  useEffect(() => {
    console.log(state.folder.title.text);
  }, [state.folder.title.text]);
  useEffect(() => {}, [state.folder.title]);
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { currentTarget } = event;
    setHalfTitle(currentTarget.value);
  };

  function removeEmojis(text: string) {
    const index1 = text.search(Regex);
    const index2 = text.search("⭐️");
    if (index2 > index1) {
      setCurrentFolderEmoji("⭐️");
      return text.replace("⭐️", "");
    } else {
      const match = text.match(Regex);

      if (match) {
        setCurrentFolderEmoji(match[0]);
        return text.replace(match[0], "");
      }
    }
    return text;
  }

  const handleEmojiSelect = useLastCallback((emoji: string, name: string) => {
    const element = document.getElementById("EmojiFoldersId");

    console.log(element?.dataset);

    if (element) {
      const textNode = document.createTextNode(emoji + name);
      element.appendChild(textNode);
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setShowIcons(false);
    setCurrentFolderEmoji(emoji);
    console.log([emoji, name]);
  });
  const [showIcons, setShowIcons] = useState(false);

  const { loadChatlistInvites, openLimitReachedModal, showNotification } =
    getActions();

  const isCreating = state.mode === "create";
  const isEditingChatList = state.folder.isChatList;

  const [isIncludedChatsListExpanded, setIsIncludedChatsListExpanded] =
    useState(false);
  const [isExcludedChatsListExpanded, setIsExcludedChatsListExpanded] =
    useState(false);

  useEffect(() => {
    if (isRemoved) {
      onReset();
    }
  }, [isRemoved, onReset]);

  useEffect(() => {
    if (isActive && state.folderId && state.folder.isChatList) {
      loadChatlistInvites({ folderId: state.folderId });
    }
  }, [isActive, state.folder.isChatList, state.folderId]);
  const includedFilters = selectChatFilters(state, "included");
  const {
    selectedChatIds: includedChatIds,
    selectedChatTypes: includedChatTypes,
  } = includedFilters;

  const excludedFilters = selectChatFilters(state, "excluded");
  const {
    selectedChatIds: excludedChatIds,
    selectedChatTypes: excludedChatTypes,
  } = excludedFilters;

  useEffect(() => {
    setIsIncludedChatsListExpanded(false);
    setIsExcludedChatsListExpanded(false);
  }, [state.folderId]);

  const allLoadedChatsSet = new Set([
    ...(loadedActiveChatIds || []),
    ...(loadedArchivedChatIds || []),
  ]);

  const loadedIncludedChatIds = findIntersectionWithSet(
    includedChatIds,
    allLoadedChatsSet
  );
  const loadedExcludedChatIds = findIntersectionWithSet(
    excludedChatIds,
    allLoadedChatsSet
  );

  const visibleIncludedChatIds = isIncludedChatsListExpanded
    ? loadedIncludedChatIds
    : loadedIncludedChatIds.slice(
        0,
        INITIAL_CHATS_LIMIT - includedChatTypes.length
      );

  const visibleExcludedChatIds = isExcludedChatsListExpanded
    ? loadedExcludedChatIds
    : loadedExcludedChatIds.slice(
        0,
        INITIAL_CHATS_LIMIT - excludedChatTypes.length
      );

  const lang = useOldLang();

  useHistoryBack({
    isActive,
    onBack,
  });

  const handleSubmit = useCallback(() => {
    dispatch({ type: "setIsLoading", payload: true });

    setTimeout(() => {}, 200);
    onSaveFolder(() => {
      setTimeout(() => {
        onReset();
      }, SUBMIT_TIMEOUT);
    });
  }, [dispatch, onSaveFolder, onReset, currentFolderEmoji, state.folder.title]);

  const handleCreateInviteClick = useCallback(() => {
    if (!invites) {
      if (isCreating) {
        onSaveFolder(onShareFolder);
      }
      return;
    }

    // Ignoring global updates is a known drawback here
    if (!selectCanShareFolder(getGlobal(), state.folderId!)) {
      showNotification({
        message: lang("ChatList.Filter.InviteLink.IncludeExcludeError"),
      });
      return;
    }

    if (chatListCount >= maxChatLists && !state.folder.isChatList) {
      openLimitReachedModal({
        limit: "chatlistJoined",
      });
      return;
    }

    if (invites.length < maxInviteLinks) {
      if (state.isTouched) {
        onSaveFolder(onShareFolder);
      } else {
        onShareFolder();
      }
      return;
    }

    openLimitReachedModal({
      limit: "chatlistInvites",
    });
  }, [
    invites,
    state.folderId,
    state.isTouched,
    chatListCount,
    maxInviteLinks,
    isCreating,
    onSaveFolder,
    onShareFolder,
    lang,
    maxChatLists,
    state.folder.isChatList,
  ]);

  const handleEditInviteClick = useCallback(
    (e: React.MouseEvent<HTMLElement>, url: string) => {
      if (state.isTouched) {
        onSaveFolder(() => onOpenInvite(url));
      } else {
        onOpenInvite(url);
      }
    },
    [onSaveFolder, onOpenInvite, state.isTouched]
  );
  function renderChatType(key: string, mode: "included" | "excluded") {
    const chatType =
      mode === "included"
        ? CUSTOM_PEER_INCLUDED_CHAT_TYPES.find(
            ({ type: typeKey }) => typeKey === key
          )
        : CUSTOM_PEER_EXCLUDED_CHAT_TYPES.find(
            ({ type: typeKey }) => typeKey === key
          );

    if (!chatType) {
      return undefined;
    }

    return (
      <ListItem
        key={chatType.type}
        className="settings-folders-list-item mb-1"
        narrow
        inactive
      >
        <PrivateChatInfo avatarSize="small" customPeer={chatType} />
      </ListItem>
    );
  }

  function renderChats(mode: "included" | "excluded") {
    const selectedChatTypes =
      mode === "included" ? includedChatTypes : excludedChatTypes;
    const visibleChatIds =
      mode === "included" ? visibleIncludedChatIds : visibleExcludedChatIds;

    const isExpanded =
      mode === "included"
        ? isIncludedChatsListExpanded
        : isExcludedChatsListExpanded;
    const allChatIds = mode === "included" ? includedChatIds : excludedChatIds;
    const leftChatsCount = allChatIds.length - visibleChatIds.length;
    const clickHandler =
      mode === "included"
        ? () => setIsIncludedChatsListExpanded(true)
        : () => setIsExcludedChatsListExpanded(true);

    return (
      <>
        {selectedChatTypes.map((key) => renderChatType(key, mode))}
        {visibleChatIds.map((id) => (
          <ListItem className="settings-folders-list-item mb-1" narrow inactive>
            {isUserId(id) ? (
              <PrivateChatInfo avatarSize="small" userId={id} />
            ) : (
              <GroupChatInfo avatarSize="small" chatId={id} />
            )}
          </ListItem>
        ))}
        {!isExpanded && leftChatsCount > 0 && (
          <ListItem
            key="load-more"
            className="settings-folders-list-item"
            narrow
            // eslint-disable-next-line react/jsx-no-bind
            onClick={clickHandler}
            icon="down"
          >
            {lang("FilterShowMoreChats", leftChatsCount, "i")}
          </ListItem>
        )}
      </>
    );
  }
  let timeoutId: string | number | NodeJS.Timeout | undefined;
  const handleMouseEnter = () => {
    if (window.innerWidth > 1000) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setShowIcons(true);
    }
  };

  const handleMouseLeave = () => {
    if (window.innerWidth > 1000) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        setShowIcons(false);
      }, 500);
    }
  };
  const handleIconClick = () => {
    if (window.innerWidth <= 1000) {
      if (showIcons) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        setShowIcons(false);
      } else {
        setShowIcons(true);
      }
    }
  };
  return (
    <div className="settings-fab-wrapper">
      <div className="settings-content no-border custom-scroll">
        <div className="settings-content-header">
          <AnimatedIcon
            size={STICKER_SIZE_FOLDER_SETTINGS}
            tgsUrl={LOCAL_TGS_URLS.FoldersNew}
            play={String(state.folderId)}
            className="settings-content-icon"
          />
          {isCreating && (
            <p
              className="settings-item-description mb-3"
              dir={lang.isRtl ? "rtl" : undefined}
            >
              {lang("FilterIncludeInfo")}
            </p>
          )}
          <div className="input-with-icon">
            {" "}
            <InputText
              id="EmojiFoldersId"
              className="mb-0 with-icon"
              label={lang("FilterNameHint")}
              value={halfTitle}
              onChange={handleChange}
              error={
                state.error && state.error === ERROR_NO_TITLE
                  ? ERROR_NO_TITLE
                  : undefined
              }
            />{" "}
            <div className="relativeDiv">
              {currentFolderEmoji !== "" ? (
                <>
                  {(() => {
                    switch (currentFolderEmoji) {
                      case "📢":
                        return (
                          <img
                            className={
                              window.innerWidth <= 1000 && showIcons
                                ? "iconFoldersEmojiHigh"
                                : "iconFoldersEmoji"
                            }
                            src={channel}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            alt="Folder Icon"
                            onClick={handleIconClick}
                          />
                        );
                      case "⭐️":
                        return (
                          <img
                            className={
                              window.innerWidth <= 1000 && showIcons
                                ? "iconFoldersEmojiHigh"
                                : "iconFoldersEmoji"
                            }
                            src={star}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            alt="Folder Icon"
                            onClick={handleIconClick}
                          />
                        );
                      case "✅":
                        return (
                          <img
                            className={
                              window.innerWidth <= 1000 && showIcons
                                ? "iconFoldersEmojiHigh"
                                : "iconFoldersEmoji"
                            }
                            src={chats}
                            alt="Folder Icon"
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onClick={handleIconClick}
                          />
                        );
                      case "👤":
                        return (
                          <img
                            className={
                              window.innerWidth <= 1000 && showIcons
                                ? "iconFoldersEmojiHigh"
                                : "iconFoldersEmoji"
                            }
                            src={user}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            alt="Folder Icon"
                            onClick={handleIconClick}
                          />
                        );
                      case "👥":
                        return (
                          <img
                            className={
                              window.innerWidth <= 1000 && showIcons
                                ? "iconFoldersEmojiHigh"
                                : "iconFoldersEmoji"
                            }
                            src={group}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            alt="Folder Icon"
                            onClick={handleIconClick}
                          />
                        );
                      case "🤖":
                        return (
                          <img
                            className={
                              window.innerWidth <= 1000 && showIcons
                                ? "iconFoldersEmojiHigh"
                                : "iconFoldersEmoji"
                            }
                            src={bot}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            alt="Folder Icon"
                            onClick={handleIconClick}
                          />
                        );
                      case "💬":
                        return (
                          <img
                            className={
                              window.innerWidth <= 1000 && showIcons
                                ? "iconFoldersEmojiHigh"
                                : "iconFoldersEmoji"
                            }
                            src={chat}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            alt="Folder Icon"
                            onClick={handleIconClick}
                          />
                        );
                      default:
                        return (
                          <span
                            className={
                              window.innerWidth <= 1000 && showIcons
                                ? "iconFoldersEmojiHigh"
                                : "iconFoldersEmoji"
                            }
                            onClick={handleIconClick}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                          >
                            {currentFolderEmoji}
                          </span>
                        );
                    }
                  })()}
                </>
              ) : (
                <img
                  className={
                    window.innerWidth <= 1000 && showIcons
                      ? "iconFoldersEmojiHigh"
                      : "iconFoldersEmoji"
                  }
                  src={folder}
                  alt="Folder Icon"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onClick={handleIconClick}
                />
              )}

              <div
                className={`flyingDiv ${showIcons ? "visible" : ""}`}
                onMouseEnter={
                  showIcons ? handleMouseEnter : () => handleMouseLeave
                }
                onMouseLeave={handleMouseLeave}
              >
                <EmojiPickerForFolders
                  className="picker-tab"
                  onEmojiSelect={handleEmojiSelect}
                  setCurrentFolderEmoji={setCurrentFolderEmoji}
                />
              </div>
            </div>
          </div>
        </div>

        {!isOnlyInvites && (
          <div className="settings-item pt-3">
            {state.error && state.error === ERROR_NO_CHATS && (
              <p
                className="settings-item-description color-danger mb-2"
                dir={lang.isRtl ? "rtl" : undefined}
              >
                {lang(state.error)}
              </p>
            )}

            <h4
              className="settings-item-header mb-3"
              dir={lang.isRtl ? "rtl" : undefined}
            >
              {lang("FilterInclude")}
            </h4>

            <ListItem
              className="settings-folders-list-item color-primary"
              icon="add"
              narrow
              onClick={onAddIncludedChats}
            >
              {lang("FilterAddChats")}
            </ListItem>

            {renderChats("included")}
          </div>
        )}

        {!isOnlyInvites && !isEditingChatList && (
          <div className="settings-item pt-3">
            <h4
              className="settings-item-header mb-3"
              dir={lang.isRtl ? "rtl" : undefined}
            >
              {lang("FilterExclude")}
            </h4>

            <ListItem
              className="settings-folders-list-item color-primary"
              icon="add"
              narrow
              onClick={onAddExcludedChats}
            >
              {lang("FilterAddChats")}
            </ListItem>

            {renderChats("excluded")}
          </div>
        )}

        <div className="settings-item pt-3">
          <h4
            className="settings-item-header mb-3"
            dir={lang.isRtl ? "rtl" : undefined}
          >
            {lang("FolderLinkScreen.Title")}
          </h4>

          <ListItem
            className="settings-folders-list-item color-primary"
            icon="add"
            narrow
            onClick={handleCreateInviteClick}
          >
            {lang("ChatListFilter.CreateLinkNew")}
          </ListItem>

          {invites?.map((invite) => (
            <ListItem
              className="settings-folders-list-item"
              icon="link"
              narrow
              multiline
              onClick={handleEditInviteClick}
              clickArg={invite.url}
            >
              <span className="title" dir="auto">
                {invite.title || invite.url}
              </span>
              <span className="subtitle">
                {lang(
                  "ChatListFilter.LinkLabelChatCount",
                  invite.peerIds.length,
                  "i"
                )}
              </span>
            </ListItem>
          ))}
        </div>
      </div>

      <FloatingActionButton
        isShown={Boolean(state.isTouched)}
        disabled={state.isLoading}
        onClick={handleSubmit}
        ariaLabel={state.mode === "edit" ? "Save changes" : "Create folder"}
      >
        {state.isLoading ? <Spinner color="white" /> : <Icon name="check" />}
      </FloatingActionButton>
    </div>
  );
};
export default withGlobal<OwnProps>((global, { state }): StateProps => {
  const { listIds } = global.chats;
  const { byId, invites } = global.chatFolders;
  const chatListCount = Object.values(byId).reduce(
    (acc, el) => acc + (el.isChatList ? 1 : 0),
    0
  );

  return {
    loadedActiveChatIds: listIds.active,
    loadedArchivedChatIds: listIds.archived,
    invites: state.folderId
      ? invites[state.folderId] || MEMO_EMPTY_ARRAY
      : undefined,
    isRemoved: state.folderId !== undefined && !byId[state.folderId],
    maxInviteLinks: selectCurrentLimit(global, "chatlistInvites"),
    maxChatLists: selectCurrentLimit(global, "chatlistJoined"),
    chatListCount,
  };
})(SettingsFoldersEdit);
