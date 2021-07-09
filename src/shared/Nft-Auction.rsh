'reach 0.1';
'use strict';

const deneme= Bytes(150);


export const main =
  Reach.App(
    {},
    [Participant('Creator', {
      getId: UInt,      
      deadline: UInt,
      nftViewAddress: deneme,
      isAuctionOn: Fun([deneme], Bool),
      informTimeout: Fun([], Null),
      seeOutcome: Fun([deneme, Address], Null),
      showBid: Fun([deneme, UInt, Address], Null),
    }),
      ParticipantClass('Bidder', {
        isAuctionOn: Fun([deneme], Bool),
        informTimeout: Fun([], Null),
        seeOutcome: Fun([deneme, Address], Null),
        getBid: Fun([deneme], UInt),
        showBid: Fun([deneme, UInt, Address], Null),
      }),
      View('NFT', {
        owner: Address,
      }),
    ],
    (Creator, Bidder, vNFT) => {
      Creator.only(() => {
        const id = declassify(interact.getId);
        const deadline = declassify(interact.deadline);
        const nftViewAddress= declassify(interact.nftViewAddress);
     
      });
      Creator.publish(id, deadline, nftViewAddress);

      var [owner, price, lastBidder, auctionOn] = [Creator, 0, Creator, false];
      { vNFT.owner.set(owner); };
      invariant(balance() == 0);
      while (true) {
        if(auctionOn === false) {
          commit();

          each([Creator, Bidder], () => {
            const isAuctionOn = this === owner ? declassify(interact.isAuctionOn(nftViewAddress)) : true;
          });

          Anybody.publish(isAuctionOn).when(owner == this).timeout(false);
          if (!isAuctionOn) {
            [owner, price, lastBidder, auctionOn] = [owner, price, lastBidder, auctionOn];
            continue;
          }
        }
        commit();
        Bidder.only(() => {            
            const bid = (this !== lastBidder && this !== owner) ? declassify(interact.getBid(nftViewAddress)) : price;
            const myAddress = (this !== lastBidder && this !== owner) ? this : lastBidder;
        });

        Bidder.publish(bid, myAddress).when(bid > price && owner != this && this !== lastBidder).timeout(deadline, () => {
          each([Creator, Bidder], () => {
            interact.seeOutcome(nftViewAddress, owner);
          });
          Bidder.pay(price).when(lastBidder == this).timeout(20, () => {
            each([Creator, Bidder], () => {
              interact.informTimeout();
            });

            Bidder.publish();
            [owner, price, lastBidder, auctionOn] = [Creator, 0, Creator, false];
            continue;
          });
          transfer(price).to(owner);

          [owner, price, lastBidder, auctionOn] = [lastBidder, 0, lastBidder, false];
          continue;
        });

        commit();

        each([Creator, Bidder], () => {
          interact.showBid(nftViewAddress, bid, lastBidder);
        });
        Anybody.publish();

        [owner, price, lastBidder, auctionOn] = [owner, bid, myAddress, true];

        continue;
      }
      commit();

      assert(false);
    });