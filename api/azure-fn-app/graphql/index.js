// eslint-disable-next-line no-undef
module.exports = async function (context, _) {
  context.log('JavaScript HTTP trigger function processed a request.')
  context.res = {
    body: {
      data: {
        posts: [
          {
            id: 1,
            title: 'This is a different post',
            body: 'Here is the body',
            createdAt: '2021-03-31T02:23:41.085Z',
            __typename: 'Post',
          },
        ],
      },
    },
  }
}
