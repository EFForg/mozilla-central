/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Communicator client code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2001
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

#ifndef nsXBLDocumentInfo_h__
#define nsXBLDocumentInfo_h__

#include "nsCOMPtr.h"
#include "nsAutoPtr.h"
#include "nsIScriptGlobalObjectOwner.h"
#include "nsWeakReference.h"
#include "nsIDocument.h"
#include "nsCycleCollectionParticipant.h"

class nsXBLPrototypeBinding;
class nsObjectHashtable;
class nsXBLDocGlobalObject;

class nsXBLDocumentInfo : public nsIScriptGlobalObjectOwner,
                          public nsSupportsWeakReference
{
public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS

  nsXBLDocumentInfo(nsIDocument* aDocument);
  virtual ~nsXBLDocumentInfo();

  already_AddRefed<nsIDocument> GetDocument()
    { nsCOMPtr<nsIDocument> copy = mDocument; return copy.forget(); }

  bool GetScriptAccess() { return mScriptAccess; }

  nsIURI* DocumentURI() { return mDocument->GetDocumentURI(); }

  nsXBLPrototypeBinding* GetPrototypeBinding(const nsACString& aRef);
  nsresult SetPrototypeBinding(const nsACString& aRef,
                               nsXBLPrototypeBinding* aBinding);

  // This removes the binding without deleting it
  void RemovePrototypeBinding(const nsACString& aRef);

  nsresult WritePrototypeBindings();

  void SetFirstPrototypeBinding(nsXBLPrototypeBinding* aBinding);
  
  void FlushSkinStylesheets();

  bool IsChrome() { return mIsChrome; }

  // nsIScriptGlobalObjectOwner methods
  virtual nsIScriptGlobalObject* GetScriptGlobalObject();

  void MarkInCCGeneration(PRUint32 aGeneration);

  static nsresult ReadPrototypeBindings(nsIURI* aURI, nsXBLDocumentInfo** aDocInfo);

  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS_AMBIGUOUS(nsXBLDocumentInfo,
                                                         nsIScriptGlobalObjectOwner)

private:
  nsCOMPtr<nsIDocument> mDocument;
  bool mScriptAccess;
  bool mIsChrome;
  // the binding table owns each nsXBLPrototypeBinding
  nsObjectHashtable* mBindingTable;
  // non-owning pointer to the first binding in the table
  nsXBLPrototypeBinding* mFirstBinding;

  nsRefPtr<nsXBLDocGlobalObject> mGlobalObject;
};

#endif
