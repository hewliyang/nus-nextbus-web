export type Bookmark = {
    caption: string,
    name: string
}

export const addBookmark = (caption: string, name: string) => {
    const bookmarks = localStorage.getItem('bookmarks');
    let arr : Bookmark[] = [];

    if (bookmarks) {
      arr = JSON.parse(bookmarks) as Bookmark[]
    }
    const newBookmark = {caption: caption, name: name}
    const updatedArr = [...arr, newBookmark]
    localStorage.setItem('bookmarks', JSON.stringify(updatedArr))
    return null;
}

export const getBookmark = () => {
    const bookmarks = localStorage.getItem('bookmarks');
    
    if (bookmarks) {
        return JSON.parse(bookmarks) as Bookmark[];
    }
}

export const deleteBookmark = (toFilter: string) => {
    var bookmarks = localStorage.getItem('bookmarks');
    let arr : Bookmark[] = [];

    if (bookmarks) {
        arr = JSON.parse(bookmarks) as Bookmark[];
    }

    const res = arr.filter(({name}) =>
        name !== toFilter
    )

    localStorage.setItem('bookmarks', JSON.stringify(res))
    return null;
}

